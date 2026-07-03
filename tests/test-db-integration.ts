import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../lib/config/env";
import { logger } from "../lib/logger";
import { runMigrations } from "../lib/db/migrations";
import { seed } from "../lib/db/seed";
import * as schema from "../lib/db/schema";
import { sql } from "drizzle-orm";

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runIntegrationTests() {
  logger.info("=== STARTING DATABASE INTEGRATION TESTS ===");

  let connectionString = env.DATABASE_URL_UNPOOLED;

  try {
    const probe = postgres(env.DATABASE_URL_UNPOOLED, { connect_timeout: 2 });
    await probe`SELECT 1`;
    await probe.end();
  } catch (probeError: unknown) {
    if (probeError && typeof probeError === "object") {
      const err = probeError as { code?: string; message?: string };
      if (err.code === "ENOTFOUND" || err.message?.includes("ENOTFOUND")) {
        logger.warn("DATABASE_URL_UNPOOLED DNS host resolution failed. Falling back to DATABASE_URL...");
        connectionString = env.DATABASE_URL;
      }
    }
  }

  // 1. Connection check
  const testClient = postgres(connectionString, { max: 5 });
  const db = drizzle(testClient, { schema });

  try {
    // 2. pgvector Extension Check
    logger.info("[TEST 1] Verifying pgvector extension...");
    await testClient`CREATE EXTENSION IF NOT EXISTS vector;`;
    const extCheck = await testClient`
      SELECT extname FROM pg_extension WHERE extname = 'vector';
    `;
    if (extCheck.length > 0 && extCheck[0].extname === "vector") {
      logger.info("[PASS] pgvector extension exists and is active.");
    } else {
      throw new Error("pgvector extension check failed!");
    }

    // 3. Advisory Locking Concurrency Test
    logger.info("[TEST 2] Verifying advisory lock concurrency behavior...");
    let client1Acquired = false;
    let client2Acquired = false;
    let client1Released = false;
    let client2OrderPassed = false;

    const runClient1 = async () => {
      const c1 = postgres(connectionString, { max: 1 });
      logger.info("Client 1: Requesting advisory lock...");
      await c1`SELECT pg_advisory_lock(987654321)`;
      client1Acquired = true;
      logger.info(`Client 1: Lock acquired status: ${client1Acquired}. Holding lock for 3 seconds...`);
      await delay(3000);
      client1Released = true;
      logger.info("Client 1: Releasing lock...");
      await c1`SELECT pg_advisory_unlock(987654321)`;
      await c1.end();
    };

    const runClient2 = async () => {
      const c2 = postgres(connectionString, { max: 1 });
      await delay(500);
      logger.info("Client 2: Requesting advisory lock (should block)...");
      await c2`SELECT pg_advisory_lock(987654321)`;
      client2Acquired = true;
      logger.info(`Client 2: Lock acquired status: ${client2Acquired}.`);
      
      if (client1Released) {
        client2OrderPassed = true;
        logger.info("[PASS] Client 2 correctly blocked until Client 1 released lock.");
      } else {
        logger.error("[FAIL] Client 2 acquired lock while Client 1 was still holding it!");
      }
      
      await c2`SELECT pg_advisory_unlock(987654321)`;
      await c2.end();
    };

    await Promise.all([runClient1(), runClient2()]);

    if (!client2OrderPassed) {
      throw new Error("Advisory lock concurrency verification failed!");
    }

    // 4. Clean schema rollback/re-run test
    logger.info("[TEST 3] Verifying clean schema migrations run...");
    
    // Drop all tables to simulate a clean rollback/reset
    logger.info("Dropping existing tables to simulate rollback state...");
    await testClient`DROP TABLE IF EXISTS "conflict_feedback" CASCADE;`;
    await testClient`DROP TABLE IF EXISTS "nli_results" CASCADE;`;
    await testClient`DROP TABLE IF EXISTS "user_memories" CASCADE;`;
    await testClient`DROP TABLE IF EXISTS "messages" CASCADE;`;
    await testClient`DROP TABLE IF EXISTS "conversations" CASCADE;`;
    await testClient`DROP TABLE IF EXISTS "chunks" CASCADE;`;
    await testClient`DROP TABLE IF EXISTS "documents" CASCADE;`;
    await testClient`DROP TABLE IF EXISTS "user_sessions" CASCADE;`;
    await testClient`DROP TABLE IF EXISTS "users" CASCADE;`;
    await testClient`DROP SCHEMA IF EXISTS "drizzle" CASCADE;`;
    logger.info("Tables and Drizzle schema dropped cleanly.");

    // Run migrations up
    logger.info("Running migrations up...");
    await runMigrations();
    logger.info("[PASS] Migrations executed successfully on clean database.");

    // 5. Seeding verification
    logger.info("[TEST 4] Running and verifying seeding system...");
    process.env.FORCE_SEED = "true";
    await seed();
    logger.info("[PASS] Seeding completed successfully.");

    // 6. Referential Integrity & Cascade Delete verification
    logger.info("[TEST 5] Verifying referential integrity and ON DELETE CASCADE...");
    
    // Query deterministic seeded user
    const seededUsers = await db.select().from(schema.users).limit(1);
    if (seededUsers.length === 0) {
      throw new Error("No seeded users found!");
    }
    const targetUser = seededUsers[0];
    logger.info(`Found target seeded user: ${targetUser.email} (${targetUser.id})`);

    // Verify dependent records exist before delete
    const userDocs = await db.select().from(schema.documents).where(sql`user_id = ${targetUser.id}`);
    logger.info(`User has ${userDocs.length} active document(s).`);
    if (userDocs.length === 0) {
      throw new Error("Expected seeded documents not found!");
    }
    const docId = userDocs[0].id;

    const docChunks = await db.select().from(schema.chunks).where(sql`document_id = ${docId}`);
    const userMemories = await db.select().from(schema.userMemories).where(sql`user_id = ${targetUser.id}`);
    
    logger.info(`Document has ${docChunks.length} chunks. User has ${userMemories.length} memories.`);
    if (docChunks.length === 0 || userMemories.length === 0) {
      throw new Error("Expected seeded dependent records not found!");
    }

    // Perform cascade delete by deleting the user
    logger.info("Deleting user (should trigger cascading deletes to all tables)...");
    await db.delete(schema.users).where(sql`id = ${targetUser.id}`);

    // Verify cascade deletes
    const remainingDocs = await db.select().from(schema.documents).where(sql`user_id = ${targetUser.id}`);
    const remainingChunks = await db.select().from(schema.chunks).where(sql`document_id = ${docId}`);
    const remainingMemories = await db.select().from(schema.userMemories).where(sql`user_id = ${targetUser.id}`);

    if (remainingDocs.length === 0 && remainingChunks.length === 0 && remainingMemories.length === 0) {
      logger.info("[PASS] Cascade delete verification succeeded! Dependent records automatically cleared.");
    } else {
      throw new Error("Cascade delete failed: dependent records still remain in database!");
    }

    logger.info("\n=== ALL DATABASE INTEGRATION TESTS PASSED SUCCESSFULLY (100% SUCCESS) ===");
    process.exit(0);

  } catch (error: unknown) {
    logger.error("Database Integration Test encountered error:");
    const err = error as Error;
    logger.error(err?.stack || err?.message || String(error));
    process.exit(1);
  } finally {
    await testClient.end();
  }
}

runIntegrationTests();

import "dotenv/config";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../config/env";
import { logger } from "../logger";

export async function runMigrations() {
  logger.info("Initializing migration runner connection...");
  
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

  const migrationClient = postgres(connectionString, {
    max: 1,
    connect_timeout: 10,
  });

  const db = drizzle(migrationClient);

  try {
    logger.info("Attempting to acquire PostgreSQL advisory lock (987654321)...");
    
    // Acquire a session-level advisory lock. If another container holds it, this will wait.
    await migrationClient`SELECT pg_advisory_lock(987654321)`;
    logger.info("Advisory lock acquired successfully. Running migrations...");

    // Run migrations
    await migrate(db, { migrationsFolder: "./drizzle" });
    logger.info("Migrations completed successfully!");

  } catch (error: unknown) {
    logger.error({ error }, "Migration execution failed");
    throw error;
  } finally {
    try {
      logger.info("Releasing PostgreSQL advisory lock (987654321)...");
      await migrationClient`SELECT pg_advisory_unlock(987654321)`;
      logger.info("Advisory lock released successfully.");
    } catch (unlockError) {
      logger.warn({ unlockError }, "Failed to release advisory lock");
    }

    logger.info("Closing migration client connection...");
    await migrationClient.end();
    logger.info("Migration connection closed.");
  }
}

// Support running directly via CLI (tsx scripts/run-migrations.ts)
if (require.main === module) {
  runMigrations()
    .then(() => {
      logger.info("Migration script execution completed.");
      process.exit(0);
    })
    .catch((err) => {
      logger.error({ err }, "Migration script execution encountered fatal error");
      process.exit(1);
    });
}

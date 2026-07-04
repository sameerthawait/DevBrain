import "dotenv/config";
import { db } from "../lib/db";
import * as schema from "../lib/db/schema";
import { eq } from "drizzle-orm";
import { DELETE as deleteUser } from "../app/api/user/delete/route";
import { NextRequest } from "next/server";
import { saveDocumentAndChunks } from "../lib/rag/store";
import { runMigrations } from "../lib/db/migrations";

async function runDeletionTests() {
  console.log("=== STARTING USER SECURE CASCADE DELETION TESTS ===");

  try {
    // 0. Ensure schema tables are initialized
    await runMigrations();

    // 1. Setup clean data state
    await db.delete(schema.userSessions);
    await db.delete(schema.documents);
    await db.delete(schema.users);

    const [testUser] = await db.insert(schema.users).values({
      email: "delete-tester@devbrain.ai",
    }).returning();

    // 2. Generate active session
    const mockToken = "delete_test_auth_token_000";
    await db.insert(schema.userSessions).values({
      userId: testUser.id,
      token: mockToken,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    // 3. Save mock RAG document chunks
    const dummyVector = new Array(768).fill(0).map((_, i) => i / 768.0);
    await saveDocumentAndChunks(
      testUser.id,
      {
        filename: "test-delete.md",
        filePath: "docs/test-delete.md",
        fileSizeBytes: 150,
        mimeType: "text/markdown",
      },
      [
        {
          id: "chunk-delete-999",
          content: "Vector content to be cascade deleted.",
          embedding: dummyVector,
          tokensCount: 6,
          metadata: {},
        }
      ]
    );

    // 4. Save long term fact memory
    await db.insert(schema.userMemories).values({
      userId: testUser.id,
      type: "long_term",
      factContent: "HNSW optimization enabled",
      embedding: dummyVector,
      metadata: {},
    });

    // Verify records exist initially
    const initUsers = await db.select().from(schema.users).where(eq(schema.users.id, testUser.id));
    const initSessions = await db.select().from(schema.userSessions).where(eq(schema.userSessions.userId, testUser.id));
    const initMemories = await db.select().from(schema.userMemories).where(eq(schema.userMemories.userId, testUser.id));
    console.log(`Initial Setup - Users: ${initUsers.length}, Sessions: ${initSessions.length}, Memories: ${initMemories.length}`);

    if (initUsers.length !== 1 || initSessions.length !== 1 || initMemories.length !== 1) {
      throw new Error("Initial test seeding failed!");
    }

    // 5. Fire DELETE request
    console.log("[1] Invocating secure account purge request...");
    const req = new NextRequest("http://localhost:3000/api/user/delete", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${mockToken}`,
      },
    });

    const res = await deleteUser(req);
    console.log(`Deletion endpoint status code: ${res.status}`);
    if (res.status !== 200) {
      throw new Error(`Expected status 200, got ${res.status}`);
    }

    const body = await res.json();
    if (body.success !== true || body.data.deleted !== true) {
      throw new Error("Purge endpoint returned failure payload!");
    }

    // 6. Verify Cascade Purge is executed on DB
    console.log("[2] Verifying CASCADE deletions across tables...");
    const endUsers = await db.select().from(schema.users).where(eq(schema.users.id, testUser.id));
    const endSessions = await db.select().from(schema.userSessions).where(eq(schema.userSessions.userId, testUser.id));
    const endMemories = await db.select().from(schema.userMemories).where(eq(schema.userMemories.userId, testUser.id));
    const endDocs = await db.select().from(schema.documents).where(eq(schema.documents.userId, testUser.id));

    console.log(`Post Deletion - Users: ${endUsers.length}, Sessions: ${endSessions.length}, Memories: ${endMemories.length}, Documents: ${endDocs.length}`);

    if (endUsers.length !== 0 || endSessions.length !== 0 || endMemories.length !== 0 || endDocs.length !== 0) {
      throw new Error("Database CASCADE delete failed! User dependent records are still lingering.");
    }

    console.log("[PASS] Secure cascade deletions validated successfully.");
    console.log("\n=== ALL USER CASCADE DELETION TESTS PASSED SUCCESSFULLY (100% SUCCESS) ===");
    process.exit(0);

  } catch (error: unknown) {
    console.error("Secure cascade deletion test failed with error:");
    console.error(error instanceof Error ? error.stack : String(error));
    process.exit(1);
  }
}

runDeletionTests();

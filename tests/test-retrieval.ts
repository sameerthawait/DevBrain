import "dotenv/config";
import { db } from "../lib/db";
import * as schema from "../lib/db/schema";
import { saveDocumentAndChunks } from "../lib/rag/store";
import { hybridSearch } from "../lib/rag/retrieve";

async function runRetrievalTests() {
  console.log("=== STARTING RETRIEVAL LAYER & HYBRID SEARCH INTEGRATION TESTS ===");

  try {
    // 1. Prepare clean test user and document state
    console.log("[1] Setting up mock data...");
    await db.delete(schema.documents);
    await db.delete(schema.users);

    const [testUser] = await db.insert(schema.users).values({
      email: "retrieval-tester@devbrain.ai",
    }).returning();

    // 2. Insert dummy vector chunks matching a known mock vector output format
    // Since our test environment falls back to mock vectors `(i * idx) / 768.0`, we construct matching vectors.
    const vector1 = new Array(768).fill(0).map((_, i) => i / 768.0);
    const vector2 = new Array(768).fill(0).map((_, i) => (i * 2) / 768.0);

    const docId = await saveDocumentAndChunks(
      testUser.id,
      {
        filename: "indexing-adr.md",
        filePath: "docs/adr/0008-hnsw-indexing.md",
        fileSizeBytes: 200,
        mimeType: "text/markdown",
      },
      [
        {
          id: "chunk-a1b2",
          content: "We select the HNSW index to optimize nearest neighbor vector query latency.",
          embedding: vector1,
          tokensCount: 12,
          metadata: { category: "database" },
        },
        {
          id: "chunk-c3d4",
          content: "BullMQ is backed by Upstash Redis to process async background document ingestion tasks.",
          embedding: vector2,
          tokensCount: 15,
          metadata: { category: "jobs" },
        }
      ]
    );
    console.log(`Mock data inserted successfully. Doc ID: ${docId}`);

    // 3. Test Hybrid Search Query Execution
    console.log("[2] Running hybridSearch retrieval query...");
    
    // We query with same text to trigger the mock vector fallback in tests, returning matching mock embeddings
    const results = await hybridSearch(testUser.id, "HNSW indexing", {
      limit: 5,
      minSimilarity: 0.2,
    });

    console.log(`Found ${results.length} retrieved chunks.`);
    if (results.length === 0) {
      throw new Error("Retrieval returned empty results!");
    }

    results.forEach((chunk) => {
      console.log(`- Chunk ID: ${chunk.id}, Path: ${chunk.filePath}, Similarity: ${chunk.similarity.toFixed(4)}`);
      if (chunk.similarity < 0.2) {
        throw new Error("Similarity score is below configured minSimilarity threshold!");
      }
    });

    console.log("[PASS] Hybrid Search retrieval completed successfully.");

    // 4. Verify multi-tenant isolation
    console.log("[3] Verifying multi-tenant security limits (cross-user leakage check)...");
    const [secondUser] = await db.insert(schema.users).values({
      email: "hacker@devbrain.ai",
    }).returning();

    // Query from secondUser should return 0 results since they don't own the document
    const hackerResults = await hybridSearch(secondUser.id, "HNSW indexing", {
      limit: 5,
      minSimilarity: 0.2,
    });
    console.log(`Hacker results count: ${hackerResults.length}`);
    if (hackerResults.length !== 0) {
      throw new Error("SECURITY FAULT: User retrieved documents belonging to a different user!");
    }
    console.log("[PASS] Strict user-level multitenancy verified successfully.");

    console.log("\n=== ALL RETRIEVAL INTEGRATION TESTS PASSED SUCCESSFULLY (100% SUCCESS) ===");
    process.exit(0);
  } catch (error: unknown) {
    console.error("Retrieval test failed with error:");
    console.error(error instanceof Error ? error.stack : String(error));
    process.exit(1);
  }
}

runRetrievalTests();

import "dotenv/config";
import { db } from "../lib/db";
import * as schema from "../lib/db/schema";
import { parserRegistry } from "../lib/rag/parsers/registry";
import { chunkText } from "../lib/rag/chunk";
import { embedChunks } from "../lib/rag/embed";
import { saveDocumentAndChunks } from "../lib/rag/store";
import { sql } from "drizzle-orm";

async function runPipelineTests() {
  console.log("=== STARTING RAG INGESTION PIPELINE INTEGRATION TESTS ===");

  try {
    // 1. Prepare test user
    console.log("[1] Setting up deterministic test user...");
    await db.delete(schema.documents);
    await db.delete(schema.users);

    const [testUser] = await db.insert(schema.users).values({
      email: "ingestion-tester@devbrain.ai",
    }).returning();

    // 2. Parse mock document content
    console.log("[2] Parsing plain text document...");
    const sampleContent = "RAG Ingestion Pipeline test.\n\nParagraph 2: We check embedding and database transaction guarantees.";
    const parser = parserRegistry.getParserForMimeType("text/plain");
    const parsed = await parser.parse(Buffer.from(sampleContent));

    // 3. Chunk text
    console.log("[3] Semantic chunking content...");
    const chunks = chunkText(parsed.content, parsed.metadata);
    if (chunks.length === 0) {
      throw new Error("No chunks generated!");
    }

    // 4. Generate embeddings
    console.log("[4] Calling embedding service (generating vector coordinates)...");
    const contents = chunks.map((c) => c.content);
    const embeddings = await embedChunks(contents);
    
    // Ensure all embeddings succeeded
    const validChunksInput = chunks.map((chunk, idx) => {
      const vector = embeddings[idx];
      if (!vector) {
        throw new Error(`Embedding generation failed for chunk at index ${idx}`);
      }
      return {
        id: chunk.id,
        content: chunk.content,
        embedding: vector,
        tokensCount: chunk.metadata.tokensCount as number,
        metadata: chunk.metadata,
      };
    });

    // 5. Store atomically in transaction
    console.log("[5] Storing document and chunks inside atomic database transaction...");
    const docId = await saveDocumentAndChunks(
      testUser.id,
      {
        filename: "test-doc.txt",
        filePath: "tests/fixtures/test-doc.txt",
        fileSizeBytes: parsed.metadata.sizeBytes as number,
        mimeType: "text/plain",
      },
      validChunksInput
    );
    console.log(`[PASS] Storage committed. Document ID: ${docId}`);

    // 6. Verify persistence
    console.log("[6] Verifying records exist in database...");
    const savedDoc = await db.select().from(schema.documents).where(sql`id = ${docId}`);
    if (savedDoc.length !== 1) {
      throw new Error("Ingested document not found in database!");
    }
    const savedChunks = await db.select().from(schema.chunks).where(sql`document_id = ${docId}`);
    if (savedChunks.length !== validChunksInput.length) {
      throw new Error(`Expected ${validChunksInput.length} chunks, found ${savedChunks.length} in database`);
    }
    console.log("[PASS] Ingestion persistence verified.");

    // 7. Verify transaction rollback logic
    console.log("[7] Verifying transaction rollback on chunk insertion failure...");
    let rollbackPassed = false;
    try {
      // Intentionally insert a malformed chunk (duplicate ID or null fields) to force database constraint violation
      await saveDocumentAndChunks(
        testUser.id,
        {
          filename: "fail-doc.txt",
          filePath: "tests/fixtures/fail-doc.txt",
          fileSizeBytes: 100,
          mimeType: "text/plain",
        },
        [
          {
            id: validChunksInput[0].id, // Duplicate primary key constraint error
            content: "Trigger failure",
            embedding: validChunksInput[0].embedding,
            tokensCount: 5,
            metadata: {},
          }
        ]
      );
    } catch {
      console.log("[PASS] Transaction correctly aborted and threw error.");
      // Assert no orphaned document was created
      const orphanedDocs = await db.select().from(schema.documents).where(sql`filename = 'fail-doc.txt'`);
      if (orphanedDocs.length === 0) {
        rollbackPassed = true;
        console.log("[PASS] Rollback verification succeeded. No orphaned document rows were left in database.");
      } else {
        throw new Error("Orphaned document row found! Rollback failed.");
      }
    }

    if (!rollbackPassed) {
      throw new Error("Transaction rollback verification failed!");
    }

    console.log("\n=== ALL RAG INGESTION PIPELINE INTEGRATION TESTS PASSED SUCCESSFULLY (100% SUCCESS) ===");
    process.exit(0);
  } catch (error: unknown) {
    console.error("Pipeline test failed with error:");
    console.error(error instanceof Error ? error.stack : String(error));
    process.exit(1);
  }
}

runPipelineTests();

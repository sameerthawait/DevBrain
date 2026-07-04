import "dotenv/config";
import { db } from "../lib/db";
import * as schema from "../lib/db/schema";
import { saveDocumentAndChunks } from "../lib/rag/store";
import { runRetrievalEvaluation, calculateRetrievalMetrics } from "../lib/rag/eval";
import { runMigrations } from "../lib/db/migrations";

async function runEvaluationTests() {
  console.log("=== STARTING GOLD EVALUATION SUITE TESTS ===");

  try {
    // 0. Ensure schema tables are initialized
    await runMigrations();

    // 1. Setup mock data matching Gold dataset IDs
    await db.delete(schema.documents);
    await db.delete(schema.users);

    const [testUser] = await db.insert(schema.users).values({
      email: "evaluator@devbrain.ai",
    }).returning();

    // Insert dummy vectors matching gold dataset queries
    // We insert document chunks with expected chunk ID keys:
    // "chunk-hnsw-001", "chunk-jobs-002", "chunk-auth-003", "chunk-store-004", "chunk-cost-005"
    const dummyVector = new Array(768).fill(0).map((_, i) => i / 768.0);
    
    await saveDocumentAndChunks(
      testUser.id,
      {
        filename: "eval-doc.md",
        filePath: "docs/eval-doc.md",
        fileSizeBytes: 500,
        mimeType: "text/markdown",
      },
      [
        {
          id: "chunk-hnsw-001",
          content: "We select the HNSW index to optimize nearest neighbor vector query latency.",
          embedding: dummyVector,
          tokensCount: 12,
          metadata: { category: "database" },
        },
        {
          id: "chunk-jobs-002",
          content: "BullMQ is backed by Upstash Redis to process async background document ingestion tasks.",
          embedding: dummyVector,
          tokensCount: 15,
          metadata: { category: "jobs" },
        },
        {
          id: "chunk-auth-003",
          content: "Why should we enforce strict multitenancy constraints on user sessions?",
          embedding: dummyVector,
          tokensCount: 10,
          metadata: { category: "security" },
        },
        {
          id: "chunk-store-004",
          content: "How are transaction rollbacks managed on chunk insertion failures?",
          embedding: dummyVector,
          tokensCount: 10,
          metadata: { category: "database" },
        },
        {
          id: "chunk-cost-005",
          content: "What are the token limits for NVIDIA NIM embeddings models?",
          embedding: dummyVector,
          tokensCount: 10,
          metadata: { category: "finance" },
        }
      ]
    );
    console.log("Mock Gold dataset records saved successfully.");

    // 2. Execute RAG Evaluation Metrics calculation
    console.log("[1] Executing automated runRetrievalEvaluation query loops...");
    const summary = await runRetrievalEvaluation(testUser.id);
    
    console.log("Evaluation Results:");
    console.log(`- Precision@1: ${summary.precisionAt1.toFixed(4)}`);
    console.log(`- Precision@5: ${summary.precisionAt5.toFixed(4)}`);
    console.log(`- Recall@5: ${summary.recallAt5.toFixed(4)}`);
    console.log(`- Recall@10: ${summary.recallAt10.toFixed(4)}`);
    console.log(`- MRR: ${summary.mrr.toFixed(4)}`);
    console.log(`- Mean Similarity: ${summary.meanSimilarity.toFixed(4)}`);
    console.log(`- Coverage: ${summary.coverage.toFixed(4)}`);

    if (summary.coverage < 0.5) {
      throw new Error("Evaluation metrics coverage is too low!");
    }

    // 3. Test calculation metrics logic directly
    console.log("[2] Verifying metrics arithmetic logic...");
    const mockReturned = [
      { id: "chunk-a", similarity: 0.8 },
      { id: "chunk-b", similarity: 0.7 },
      { id: "chunk-c", similarity: 0.6 },
    ] as import("../lib/rag/retrieve").RetrievedChunk[];
    
    const calc = calculateRetrievalMetrics(mockReturned, ["chunk-b"]);
    if (calc.precisionAt1 !== 0 || calc.precisionAt3 !== 1/3 || calc.mrr !== 0.5) {
      throw new Error("Retrieval metrics calculation arithmetic error!");
    }

    console.log("[PASS] Metrics arithmetic and validation complete.");
    console.log("\n=== ALL EVALUATION TESTS PASSED SUCCESSFULLY (100% SUCCESS) ===");
    process.exit(0);

  } catch (error: unknown) {
    console.error("Evaluation test failed with error:");
    console.error(error instanceof Error ? error.stack : String(error));
    process.exit(1);
  }
}

runEvaluationTests();

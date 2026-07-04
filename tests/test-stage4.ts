import "dotenv/config";
import { classifyDecision } from "../lib/rag/decision-classifier";
import { calculateEmbeddingCost, calculateCompletionCost } from "../lib/rag/cost";
import { enqueueIngestionJob, ingestionQueue } from "../lib/jobs/queue";
import "../lib/jobs/worker";
import { db } from "../lib/db";
import * as schema from "../lib/db/schema";
import { sql } from "drizzle-orm";

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTests() {
  console.log("=== STARTING STAGE 4 MISSING WORK UNIT & INTEGRATION TESTS ===");

  // 1. Test Cost Tracking calculations
  console.log("[1] Testing Cost Calculations...");
  const embedCost = calculateEmbeddingCost(20000); // 20k tokens for canonical embeddings
  const expectedEmbedCost = (20000 / 1000) * 0.0001; // $0.002
  if (embedCost !== expectedEmbedCost) {
    throw new Error(`Embedding cost mismatch: expected ${expectedEmbedCost}, got ${embedCost}`);
  }

  const completionCost = calculateCompletionCost(5000, 10000); // 5k input, 10k output
  const expectedCompletionCost = (5000 / 1000) * 0.0007 + (10000 / 1000) * 0.0007; // $0.0105
  if (completionCost !== expectedCompletionCost) {
    throw new Error(`Completion cost mismatch: expected ${expectedCompletionCost}, got ${completionCost}`);
  }
  console.log("[PASS] Cost tracking calculations succeeded.");

  // 2. Test Decision Classifier
  console.log("[2] Testing Decision Classifier...");
  
  // ADR test
  const adrText = "# ADR: Choose HNSW Indexing\nStatus: accepted\nContext: We need fast vector searches.\nDecision: We choose HNSW.\nConsequences: Faster query lookups.";
  const adrClass = await classifyDecision(adrText);
  if (adrClass.decisionType !== "ADR" || adrClass.confidence < 0.9) {
    throw new Error(`ADR classification failed: got ${adrClass.decisionType} (${adrClass.confidence})`);
  }

  // Bug Fix test
  const bugFixText = "This commit fixes a memory leak in the database client wrapper and resolves connection crashes.";
  const bugClass = await classifyDecision(bugFixText);
  if (bugClass.decisionType !== "Bug Fix") {
    throw new Error(`Bug Fix classification failed: got ${bugClass.decisionType}`);
  }

  // Unknown test
  const randomText = "Today is a sunny day in Singapore.";
  const randomClass = await classifyDecision(randomText);
  if (randomClass.decisionType !== "Unknown") {
    throw new Error(`Unknown text classified as: ${randomClass.decisionType}`);
  }
  console.log("[PASS] Decision Classifier rules succeeded.");

  // 3. Test Background Queue & Worker Ingestion pipeline
  console.log("[3] Testing Background Job Queue & Worker Ingestion...");
  
  // Prepare database clean state
  await db.delete(schema.documents);
  await db.delete(schema.users);
  await db.delete(schema.userMemories);

  const [testUser] = await db.insert(schema.users).values({
    email: "background-tester@devbrain.ai",
  }).returning();

  // Clear previous queue jobs to isolate test run
  await ingestionQueue.clean(0, 1000, "completed");
  await ingestionQueue.clean(0, 1000, "failed");

  // Enqueue ingestion job
  const testContent = "ADR-0008: Choosing HNSW Indexing for vector search optimizations.\n\nStatus: accepted\nContext: high-concurrency vector query execution.";
  const jobId = await enqueueIngestionJob(
    testUser.id,
    {
      filename: "queue-doc.txt",
      filePath: "docs/queue-doc.txt",
      fileSizeBytes: testContent.length,
      mimeType: "text/plain",
    },
    testContent
  );

  console.log(`Enqueued job ID: ${jobId}. Waiting for worker processing...`);

  // Wait for worker to pick up and process job (using poll with a timeout)
  let success = false;
  for (let attempt = 1; attempt <= 15; attempt++) {
    await delay(1000);
    const job = await ingestionQueue.getJob(jobId);
    
    // Check if document was persisted successfully to database
    const savedDoc = await db.select().from(schema.documents).where(sql`filename = 'queue-doc.txt'`);
    if (savedDoc.length === 1) {
      success = true;
      console.log(`[PASS] Ingestion job completed and persisted on attempt ${attempt}. Document ID: ${savedDoc[0].id}`);
      
      // Verify cost tracking was recorded in database userMemories
      const costLog = await db.select().from(schema.userMemories).where(sql`user_id = ${testUser.id} AND type = 'usage_log'`);
      if (costLog.length === 0) {
        throw new Error("No usage log persisted for completed ingestion job!");
      }
      
      // Verify decision extraction was recorded in database userMemories
      const decisionLog = await db.select().from(schema.userMemories).where(sql`user_id = ${testUser.id} AND type = 'decision'`);
      if (decisionLog.length === 0) {
        throw new Error("No decision memory persisted for classified ADR document!");
      }
      
      console.log("[PASS] Persistent cost log and decision logic verified in database.");
      break;
    }

    if (job && job.failedReason) {
      throw new Error(`Job execution failed: ${job.failedReason}`);
    }
  }

  if (!success) {
    throw new Error("Ingestion job processing timed out or failed to persist document!");
  }

  console.log("\n=== ALL STAGE 4 MISSING WORK TESTS PASSED SUCCESSFULLY (100% SUCCESS) ===");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

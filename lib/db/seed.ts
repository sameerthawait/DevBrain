import "dotenv/config";
import { db } from "./index";
import * as schema from "./schema";
import { env } from "../config/env";
import { logger } from "../logger";

// A utility helper to generate a mock embedding of size 768
function generateMockEmbedding(val: number): number[] {
  const arr = new Array(768).fill(0);
  for (let i = 0; i < 768; i++) {
    arr[i] = (i * val) / 768.0;
  }
  return arr;
}

export async function seed() {
  logger.info("Initializing production database protection check...");

  const dbUrl = env.DATABASE_URL.toLowerCase();
  const isLocalHost = dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1") || dbUrl.includes("devbrain-postgres-test");
  const isSupabaseProd = (dbUrl.includes("supabase.co") || dbUrl.includes("supabase.com")) && !dbUrl.includes("localhost");
  const isForceSeed = process.env.FORCE_SEED === "true";

  if ((!isLocalHost || isSupabaseProd) && !isForceSeed) {
    const errorMsg = `DATABASE SEEDING BLOCKED: Target database URL "${env.DATABASE_URL}" is identified as a remote production environment. Seeding is only permitted on local/test databases (localhost, 127.0.0.1) or by explicitly setting FORCE_SEED=true to avoid accidental data loss.`;
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }

  logger.info("Database URL validated as local/development. Starting deterministic seed...");

  // 1. Clean up existing data to guarantee determinism in reverse order of foreign key dependency
  logger.info("Cleaning up existing schema records...");
  await db.delete(schema.conflictFeedback);
  await db.delete(schema.nliResults);
  await db.delete(schema.userMemories);
  await db.delete(schema.messages);
  await db.delete(schema.conversations);
  await db.delete(schema.chunks);
  await db.delete(schema.documents);
  await db.delete(schema.userSessions);
  await db.delete(schema.users);

  // 2. Insert Users
  logger.info("Inserting deterministic users...");
  const [user1] = await db.insert(schema.users).values({
    email: "dev-lead@devbrain.ai",
    monthlyTokenUsage: 12000,
    tokenLimit: 10000000,
  }).returning();

  const [user2] = await db.insert(schema.users).values({
    email: "reviewer@devbrain.ai",
    monthlyTokenUsage: 0,
    tokenLimit: 10000000,
  }).returning();

  // 3. Insert User Sessions
  logger.info("Inserting deterministic user sessions...");
  await db.insert(schema.userSessions).values({
    userId: user1.id,
    token: "mock_session_token_123",
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // expires in 24 hours
  });

  // 4. Insert Documents
  logger.info("Inserting deterministic documents...");
  const [doc1] = await db.insert(schema.documents).values({
    userId: user1.id,
    filename: "0008-hnsw-indexing.md",
    filePath: "docs/adr/0008-hnsw-indexing.md",
    fileSizeBytes: 2048,
    mimeType: "text/markdown",
  }).returning();

  // 5. Insert Chunks
  logger.info("Inserting deterministic document chunks...");
  const [chunk1] = await db.insert(schema.chunks).values({
    documentId: doc1.id,
    content: "HNSW indexes perform exceptionally well for pgvector nearest neighbor queries.",
    tokensCount: 15,
    embedding: generateMockEmbedding(0.125),
    metadata: { lineStart: 1, lineEnd: 4, author: "lead-dev" },
  }).returning();

  // 6. Insert Conversations
  logger.info("Inserting deterministic conversations...");
  const [conv1] = await db.insert(schema.conversations).values({
    userId: user1.id,
    title: "Database Index Tuning Discussion",
  }).returning();

  // 7. Insert Messages
  logger.info("Inserting deterministic messages...");
  const [msg1] = await db.insert(schema.messages).values({
    conversationId: conv1.id,
    sender: "user",
    content: "Which database index types should we use for approximate nearest neighbor searches?",
    createdAt: new Date(),
  }).returning();

  const [msg2] = await db.insert(schema.messages).values({
    conversationId: conv1.id,
    sender: "assistant",
    content: "For pgvector embeddings, we should utilize HNSW (Hierarchical Navigable Small World) index over IVFFlat due to higher recall metrics and lower query latency on typical workloads.",
    citations: [chunk1.id],
    createdAt: new Date(),
  }).returning();

  // 8. Insert User Memories
  logger.info("Inserting deterministic user memories...");
  await db.insert(schema.userMemories).values({
    userId: user1.id,
    type: "long_term",
    factContent: "HNSW index selection accepted for pgvector optimization.",
    embedding: generateMockEmbedding(0.5),
    metadata: { source: "conversation_db_tuning" },
  });

  // 9. Insert NLI Results
  logger.info("Inserting deterministic NLI results...");
  const [nli1] = await db.insert(schema.nliResults).values({
    messageId: msg2.id,
    claimA: "We use HNSW index for vector optimization.",
    claimB: "We use IVFFlat index for vector optimization.",
    verdict: "contradiction",
    confidence: "0.9850",
  }).returning();

  // 10. Insert Conflict Feedback
  logger.info("Inserting deterministic conflict feedback...");
  await db.insert(schema.conflictFeedback).values({
    messageId: msg2.id,
    isHelpful: true,
    comment: "Accurate retrieval verification and contradiction detection",
  });

  logger.info("✓ Deterministic seed process completed successfully!");
}

if (require.main === module) {
  seed()
    .then(() => {
      logger.info("Seed script completed.");
      process.exit(0);
    })
    .catch((err) => {
      logger.error({ err }, "Seed script failed with error");
      process.exit(1);
    });
}

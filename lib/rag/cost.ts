import { db } from "../db";
import * as schema from "../db/schema";
import { sql } from "drizzle-orm";
import { logger } from "../logger";

// Pricing Constants (USD per 1,000 tokens)
export const PRICING_LIMITS = {
  "nvidia/canonical-embeddings": {
    input: 0.0001,
    output: 0.0001,
  },
  "nvidia/nemotron-3-nano-30b-a3b": {
    input: 0.0007,
    output: 0.0007,
  },
  default: {
    input: 0.0005,
    output: 0.0015,
  },
};

/**
 * Calculate cost in USD for embedding generation.
 */
export function calculateEmbeddingCost(tokens: number, model = "nvidia/canonical-embeddings"): number {
  const price = PRICING_LIMITS[model as keyof typeof PRICING_LIMITS] || PRICING_LIMITS.default;
  return (tokens / 1000) * price.input;
}

/**
 * Calculate cost in USD for chat completion.
 */
export function calculateCompletionCost(
  inputTokens: number,
  outputTokens: number,
  model = "nvidia/nemotron-3-nano-30b-a3b"
): number {
  const price = PRICING_LIMITS[model as keyof typeof PRICING_LIMITS] || PRICING_LIMITS.default;
  const inputCost = (inputTokens / 1000) * price.input;
  const outputCost = (outputTokens / 1000) * price.output;
  return inputCost + outputCost;
}

/**
 * Persists API cost accounting metrics into the database.
 * Updates user token quotas and logs detailed transaction costs.
 */
export async function persistCostLog(
  userId: string,
  log: {
    inputTokens?: number;
    outputTokens?: number;
    embeddingTokens?: number;
    provider: string;
    model: string;
    latencyMs: number;
  }
): Promise<void> {
  const timestamp = new Date();
  const input = log.inputTokens || 0;
  const output = log.outputTokens || 0;
  const embed = log.embeddingTokens || 0;
  const totalTokens = input + output + embed;

  // Calculate estimated USD cost
  let estimatedCost = 0;
  if (embed > 0) {
    estimatedCost = calculateEmbeddingCost(embed, log.model);
  } else {
    estimatedCost = calculateCompletionCost(input, output, log.model);
  }

  logger.info({
    msg: "Logging cost tracking record",
    userId,
    totalTokens,
    estimatedCostUsd: estimatedCost,
  });

  try {
    await db.transaction(async (tx) => {
      // 1. Update cumulative monthly usage in users table
      await tx
        .update(schema.users)
        .set({
          monthlyTokenUsage: sql`monthly_token_usage + ${totalTokens}`,
        })
        .where(sql`id = ${userId}`);

      // 2. Persist the detailed usage metrics into user_memories as a structured audit log
      const dummyEmbedding = new Array(768).fill(0); // 768-dimension zero vector
      await tx.insert(schema.userMemories).values({
        userId,
        type: "usage_log",
        factContent: `API Usage Log: ${log.model} by ${log.provider}`,
        embedding: dummyEmbedding,
        metadata: {
          inputTokens: input,
          outputTokens: output,
          embeddingTokens: embed,
          provider: log.provider,
          model: log.model,
          latencyMs: log.latencyMs,
          estimatedCostUsd: estimatedCost,
          timestamp: timestamp.toISOString(),
        },
      });
    });
  } catch (error: unknown) {
    logger.error({
      msg: "Failed to persist cost tracking metrics",
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

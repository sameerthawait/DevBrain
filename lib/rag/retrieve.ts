import { db } from "../db";
import * as schema from "../db/schema";
import { sql, and, eq, gte, lte, inArray, desc } from "drizzle-orm";
import { embedChunks } from "./embed";
import { logger } from "../logger";
import Redis from "ioredis";
import { env } from "../config/env";
import { createHash } from "crypto";

const EMBEDDING_VERSION = "v1";
const RETRIEVAL_VERSION = "v1";
const CACHE_TTL = 300; // 5 minutes

const getRedisConfig = () => {
  const url = new URL(env.UPSTASH_REDIS_REST_URL);
  return {
    host: url.hostname,
    port: 6379,
    password: env.UPSTASH_REDIS_REST_TOKEN,
    tls: {},
  };
};

let redisClient: Redis | null = null;
function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(getRedisConfig());
  }
  return redisClient;
}

export interface RetrievalFilters {
  projectId?: string;
  conversationId?: string;
  dateRange?: string;
  sourceType?: string;
  language?: string;
  tags?: string[];
  decisionType?: string;
  confidence?: number;
  limit?: number;
  offset?: number;
  minSimilarity?: number;
}

export interface RetrievedChunk {
  id: string;
  documentId: string;
  filename: string;
  filePath: string;
  content: string;
  similarity: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

/**
 * Parse human relative date expressions into absolute JavaScript Date ranges.
 * Supports: today, yesterday, last week, last month, last quarter, last year, this sprint, last sprint, specific dates, ranges.
 */
export function parseDateExpression(expression: string): { start: Date; end: Date } {
  const cleanExpr = expression.trim().toLowerCase();
  const now = new Date();
  
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const todayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

  if (cleanExpr === "today") {
    return { start: todayStart, end: todayEnd };
  }

  if (cleanExpr === "yesterday") {
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayEnd = new Date(todayEnd.getTime() - 24 * 60 * 60 * 1000);
    return { start: yesterdayStart, end: yesterdayEnd };
  }

  if (cleanExpr === "last week") {
    const start = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { start, end: todayEnd };
  }

  if (cleanExpr === "last month") {
    const start = new Date(todayStart);
    start.setUTCMonth(start.getUTCMonth() - 1);
    return { start, end: todayEnd };
  }

  if (cleanExpr === "last quarter") {
    const start = new Date(todayStart);
    start.setUTCMonth(start.getUTCMonth() - 3);
    return { start, end: todayEnd };
  }

  if (cleanExpr === "last year") {
    const start = new Date(todayStart);
    start.setUTCFullYear(start.getUTCFullYear() - 1);
    return { start, end: todayEnd };
  }

  if (cleanExpr === "this sprint") {
    const start = new Date(todayStart.getTime() - 14 * 24 * 60 * 60 * 1000);
    return { start, end: todayEnd };
  }

  if (cleanExpr === "last sprint") {
    const start = new Date(todayStart.getTime() - 28 * 24 * 60 * 60 * 1000);
    const end = new Date(todayEnd.getTime() - 14 * 24 * 60 * 60 * 1000);
    return { start, end };
  }

  const rangeMatch = cleanExpr.match(/^(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})$/);
  if (rangeMatch) {
    const start = new Date(Date.parse(rangeMatch[1] + "T00:00:00.000Z"));
    const end = new Date(Date.parse(rangeMatch[2] + "T23:59:59.999Z"));
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      return { start, end };
    }
  }

  const singleMatch = cleanExpr.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (singleMatch) {
    const start = new Date(Date.parse(singleMatch[1] + "T00:00:00.000Z"));
    const end = new Date(Date.parse(singleMatch[1] + "T23:59:59.999Z"));
    if (!isNaN(start.getTime())) {
      return { start, end };
    }
  }

  throw new Error(`Unable to parse relative or absolute date expression: "${expression}"`);
}

/**
 * Generate a secure, deterministic cache key prefixed by userId to prevent cross-user leakage.
 */
export function generateCacheKey(userId: string, query: string, filters: RetrievalFilters): string {
  const filterString = JSON.stringify(filters);
  const hash = createHash("sha256")
    .update(`${query}:${filterString}:${EMBEDDING_VERSION}:${RETRIEVAL_VERSION}`)
    .digest("hex");
  return `retrieval-cache:${userId}:${hash}`;
}

/**
 * Perform hybrid RAG retrieval utilizing cosine similarity and metadata filtering with strict 2s timeout and caching.
 */
export async function hybridSearch(
  userId: string,
  query: string,
  filters: RetrievalFilters = {}
): Promise<RetrievedChunk[]> {
  const startTime = Date.now();
  const cacheKey = generateCacheKey(userId, query, filters);
  const client = getRedisClient();

  // 1. Cache lookup
  try {
    const cached = await client.get(cacheKey);
    if (cached) {
      logger.info({ msg: "Retrieval cache hit", userId, query });
      return JSON.parse(cached) as RetrievedChunk[];
    }
  } catch (cacheError: unknown) {
    logger.warn({ msg: "Retrieval cache lookup failed", error: String(cacheError) });
  }

  // 2. Timeout handling wrapped around core retrieval logic
  const retrievalPromise = async (): Promise<RetrievedChunk[]> => {
    // Generate query embedding
    const embeddings = await embedChunks([query]);
    const queryVector = embeddings[0];
    if (!queryVector) {
      throw new Error("Failed to generate embedding for search query.");
    }

    const limitVal = filters.limit || 10;
    const offsetVal = filters.offset || 0;
    const minSim = filters.minSimilarity || 0.3;

    // Build conditional database query clauses
    const clauses = [eq(schema.documents.userId, userId)];

    if (filters.dateRange) {
      const parsedDate = parseDateExpression(filters.dateRange);
      clauses.push(
        gte(schema.chunks.createdAt, parsedDate.start),
        lte(schema.chunks.createdAt, parsedDate.end)
      );
    }

    if (filters.sourceType) {
      clauses.push(eq(schema.documents.mimeType, filters.sourceType));
    }

    // JSONB metadata filters
    if (filters.projectId) {
      clauses.push(sql`${schema.chunks.metadata}->>'projectId' = ${filters.projectId}`);
    }
    if (filters.conversationId) {
      clauses.push(sql`${schema.chunks.metadata}->>'conversationId' = ${filters.conversationId}`);
    }
    if (filters.language) {
      clauses.push(sql`${schema.chunks.metadata}->>'language' = ${filters.language}`);
    }
    if (filters.decisionType) {
      clauses.push(sql`${schema.chunks.metadata}->'decisionClassification'->>'decisionType' = ${filters.decisionType}`);
    }
    if (filters.confidence !== undefined) {
      clauses.push(sql`(${schema.chunks.metadata}->'decisionClassification'->>'confidence')::numeric >= ${filters.confidence}`);
    }
    if (filters.tags && filters.tags.length > 0) {
      // Check if chunk metadata contains any of the tags
      clauses.push(sql`${schema.chunks.metadata}->'tags' ?| ${filters.tags}`);
    }

    // Format query vector as PostgreSQL pgvector string format: '[x1,x2,...]'
    const vectorString = `[${queryVector.join(",")}]`;

    // Direct pgvector cosine distance: embedding <=> query_vector
    // Cosine similarity = 1 - cosine distance
    const similarityExpression = sql<number>`1 - (${schema.chunks.embedding} <=> ${vectorString}::vector)`;

    const queryResult = await db
      .select({
        id: schema.chunks.id,
        documentId: schema.chunks.documentId,
        filename: schema.documents.filename,
        filePath: schema.documents.filePath,
        content: schema.chunks.content,
        similarity: similarityExpression,
        metadata: schema.chunks.metadata,
        createdAt: schema.chunks.createdAt,
      })
      .from(schema.chunks)
      .innerJoin(schema.documents, eq(schema.chunks.documentId, schema.documents.id))
      .where(and(...clauses))
      .orderBy(desc(similarityExpression), schema.chunks.id) // Deterministic stable ordering
      .limit(limitVal + offsetVal);

    // Filter results matching minimum similarity threshold and apply offset pagination
    const filteredResults = queryResult
      .filter((row) => row.similarity >= minSim)
      .map((row) => ({
        id: row.id,
        documentId: row.documentId,
        filename: row.filename,
        filePath: row.filePath,
        content: row.content,
        similarity: row.similarity,
        metadata: row.metadata as Record<string, unknown>,
        createdAt: row.createdAt.toISOString(),
      }))
      .slice(offsetVal, offsetVal + limitVal);

    // Save to cache
    try {
      await client.set(cacheKey, JSON.stringify(filteredResults), "EX", CACHE_TTL);
    } catch (cacheSetError: unknown) {
      logger.warn({ msg: "Retrieval cache set failed", error: String(cacheSetError) });
    }

    return filteredResults;
  };

  // Enforce 2-second strict timeout limit
  return Promise.race([
    retrievalPromise(),
    new Promise<RetrievedChunk[]>((_, reject) =>
      setTimeout(() => reject(new Error("Search Temporarily Degraded: Query timeout exceeded 2 seconds")), 2000)
    ),
  ]).catch((err: unknown) => {
    const latency = Date.now() - startTime;
    logger.error({
      msg: "Retrieval error or timeout exceeded",
      userId,
      latencyMs: latency,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  });
}

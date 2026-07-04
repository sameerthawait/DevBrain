import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { z } from "zod";
import { hybridSearch } from "@/lib/rag/retrieve";
import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/request-handler";

// Schema for query parameter validation
const searchParamsSchema = z.object({
  query: z.string().min(1, "Query parameter 'query' is required and must not be empty"),
  projectId: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),
  dateRange: z.string().optional(),
  sourceType: z.string().optional(),
  language: z.string().optional(),
  decisionType: z.string().optional(),
  confidence: z.coerce.number().min(0).max(1).optional(),
  tags: z.array(z.string()).optional().or(z.string().transform((val) => val.split(","))).optional(),
  limit: z.coerce.number().int().positive().max(100).default(10),
  offset: z.coerce.number().int().nonnegative().default(0),
});

async function searchHandler(request: NextRequest): Promise<Response> {
  const url = new URL(request.url);
  const rawParams = {
    query: url.searchParams.get("query"),
    projectId: url.searchParams.get("projectId") || undefined,
    conversationId: url.searchParams.get("conversationId") || undefined,
    dateRange: url.searchParams.get("dateRange") || undefined,
    sourceType: url.searchParams.get("sourceType") || undefined,
    language: url.searchParams.get("language") || undefined,
    decisionType: url.searchParams.get("decisionType") || undefined,
    confidence: url.searchParams.get("confidence") || undefined,
    tags: url.searchParams.get("tags") || undefined,
    limit: url.searchParams.get("limit") || undefined,
    offset: url.searchParams.get("offset") || undefined,
  };

  // 1. Validate query parameters
  const parsed = searchParamsSchema.safeParse(rawParams);
  if (!parsed.success) {
    logger.warn({ msg: "Invalid search API parameters", errors: parsed.error.format() });
    return new Response(
      JSON.stringify({
        error: "Bad Request",
        message: "Invalid query parameters provided",
        details: parsed.error.format(),
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // 2. Authentication: Resolve session token from Authorization header
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    logger.warn("Unauthorized search request: Missing or invalid Authorization header");
    return new Response(
      JSON.stringify({ error: "Unauthorized", message: "Authentication required" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const sessionToken = authHeader.substring(7);

  // Validate session in database
  const sessionResult = await db
    .select({
      id: schema.userSessions.id,
      userId: schema.userSessions.userId,
      expiresAt: schema.userSessions.expiresAt,
    })
    .from(schema.userSessions)
    .where(
      and(
        eq(schema.userSessions.token, sessionToken),
        gte(schema.userSessions.expiresAt, new Date())
      )
    )
    .limit(1);

  if (sessionResult.length === 0) {
    logger.warn("Unauthorized search request: Session expired or invalid");
    return new Response(
      JSON.stringify({ error: "Unauthorized", message: "Session expired or invalid" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const authenticatedUserId = sessionResult[0].userId;

  // 3. Execute Search
  const { query, limit, offset, dateRange, sourceType, language, projectId, conversationId, decisionType, confidence, tags } = parsed.data;

  try {
    const results = await hybridSearch(authenticatedUserId, query, {
      limit,
      offset,
      dateRange,
      sourceType,
      language,
      projectId,
      conversationId,
      decisionType,
      confidence,
      tags,
    });

    return new Response(
      JSON.stringify({
        query,
        count: results.length,
        results,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    logger.error({ msg: "Search execution failed", error: String(error) });
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred during search execution",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export const GET = withLogging(searchHandler);

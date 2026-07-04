import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { z } from "zod";
import { secondBrainAgent } from "@/lib/agents/second-brain-agent";
import { sendError } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/request-handler";
import { checkRateLimit } from "@/lib/rate-limiter";

const chatRequestSchema = z.object({
  query: z.string().min(1, "Query is required and must not be empty"),
  conversationId: z.string().uuid().optional(),
});

async function chatHandler(request: NextRequest): Promise<Response> {
  const requestId = crypto.randomUUID();

  // 1. Zod Request Body Validation
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return sendError("BAD_REQUEST", "Invalid JSON payload provided", requestId, 400);
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return sendError("BAD_REQUEST", "Invalid parameters provided", requestId, 400);
  }

  // 2. Authentication: Resolve session token from Authorization header
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendError("UNAUTHORIZED", "Authentication credentials missing", requestId, 401);
  }

  const sessionToken = authHeader.substring(7);

  // Validate session in database
  const sessionResult = await db
    .select({
      userId: schema.userSessions.userId,
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
    return sendError("UNAUTHORIZED", "Session expired or invalid", requestId, 401);
  }

  const authenticatedUserId = sessionResult[0].userId;

  // 2.5. Rate Limiting check
  const rateLimit = await checkRateLimit(authenticatedUserId);
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({
        success: false,
        code: "TOO_MANY_REQUESTS",
        message: `Rate limit exceeded. Please retry after ${rateLimit.retryAfterSeconds} seconds.`,
        requestId,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      }
    );
  }

  const { query } = parsed.data;

  try {
    // 3. Invoke Agent Graph
    const finalState = await secondBrainAgent.invoke({
      userId: authenticatedUserId,
      query,
      intent: "Unknown" as any,
      isSafe: true,
      retrievedChunks: [],
      context: "",
      prompts: { system: "", user: "" },
      response: "",
      citationsVerified: false,
    });

    // 4. Return Server Sent Events (SSE) simulated stream chunking of response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Enqueue progressive tokens
        const words = finalState.response.split(" ");
        for (let i = 0; i < words.length; i++) {
          const chunk = `data: ${JSON.stringify({ text: words[i] + (i < words.length - 1 ? " " : "") })}\n\n`;
          controller.enqueue(encoder.encode(chunk));
          // Yield execution to simulate network streaming latency
          await new Promise((r) => setTimeout(r, 10));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "x-request-id": requestId,
      },
    });

  } catch (error: unknown) {
    logger.error({ msg: "Chat agent execution failed", error: String(error) });
    return sendError("INTERNAL_ERROR", "Failed to generate answer synthesis", requestId, 500);
  }
}

export const POST = withLogging(chatHandler);

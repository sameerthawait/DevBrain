import "dotenv/config";
import { db } from "../lib/db";
import * as schema from "../lib/db/schema";
import { POST as chatPOST } from "../app/api/chat/route";
import { NextRequest } from "next/server";
import { runMigrations } from "../lib/db/migrations";
import { redis } from "../lib/redis";

async function runRateLimiterTests() {
  console.log("=== STARTING REDIS SLIDING WINDOW RATE LIMITER INTEGRATION TESTS ===");

  try {
    // 0. Ensure schema tables are initialized
    await runMigrations();

    // 1. Setup clean data state
    await db.delete(schema.userSessions);
    await db.delete(schema.users);

    const [testUser] = await db.insert(schema.users).values({
      email: "rate-limiter-tester@devbrain.ai",
    }).returning();

    // Clean Redis key for this user
    const rateLimitKey = `ratelimit:${testUser.id}`;
    await redis.del(rateLimitKey);

    // 2. Generate active session
    const mockToken = "rate_limit_test_auth_token_555";
    await db.insert(schema.userSessions).values({
      userId: testUser.id,
      token: mockToken,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    console.log("[1] Sending 20 requests to verify allowed quota...");
    for (let i = 1; i <= 20; i++) {
      const req = new NextRequest("http://localhost:3000/api/chat", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mockToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `Explain indexing query ${i}`,
        }),
      });

      const res = await chatPOST(req);
      if (res.status !== 200) {
        throw new Error(`Expected request ${i} to succeed with 200, got ${res.status}`);
      }
    }
    console.log("[PASS] Sent 20 requests successfully (Quota within limit).");

    console.log("[2] Sending 21st request expecting 429 Too Many Requests...");
    const overflowReq = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mockToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: "Explain indexing query 21",
      }),
    });

    const overflowRes = await chatPOST(overflowReq);
    console.log(`Overflow request status code: ${overflowRes.status}`);
    console.log(`Overflow request Retry-After header: ${overflowRes.headers.get("Retry-After")}`);

    if (overflowRes.status !== 429) {
      throw new Error(`Expected overflow request to be rejected with 429, got ${overflowRes.status}`);
    }

    const retryAfter = overflowRes.headers.get("Retry-After");
    if (!retryAfter || parseInt(retryAfter, 10) <= 0) {
      throw new Error("Missing or invalid Retry-After header!");
    }

    const body = await overflowRes.json();
    if (body.success !== false || body.code !== "TOO_MANY_REQUESTS") {
      throw new Error("Invalid error payload structure for rate limits!");
    }

    console.log("[PASS] 21st request rejected successfully with Retry-After headers.");
    console.log("\n=== ALL RATE LIMITER INTEGRATION TESTS PASSED SUCCESSFULLY (100% SUCCESS) ===");
    process.exit(0);

  } catch (error: unknown) {
    console.error("Rate limiter integration test failed with error:");
    console.error(error instanceof Error ? error.stack : String(error));
    process.exit(1);
  }
}

runRateLimiterTests();

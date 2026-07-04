import "dotenv/config";
import { db } from "../lib/db";
import * as schema from "../lib/db/schema";
import { saveDocumentAndChunks } from "../lib/rag/store";
import { POST as chatPOST } from "../app/api/chat/route";
import { NextRequest } from "next/server";
import { runMigrations } from "../lib/db/migrations";

async function runChatApiTests() {
  console.log("=== STARTING CHAT API STREAMING INTEGRATION TESTS ===");

  try {
    // 0. Ensure schema tables are initialized
    await runMigrations();

    // 1. Setup clean data state
    await db.delete(schema.userSessions);
    await db.delete(schema.documents);
    await db.delete(schema.users);

    const [testUser] = await db.insert(schema.users).values({
      email: "chat-tester@devbrain.ai",
    }).returning();

    // 2. Generate active session
    const mockToken = "chat_test_auth_token_789";
    await db.insert(schema.userSessions).values({
      userId: testUser.id,
      token: mockToken,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    // 3. Save mock RAG documentation chunk
    const dummyVector = new Array(768).fill(0).map((_, i) => i / 768.0);
    await saveDocumentAndChunks(
      testUser.id,
      {
        filename: "indexing.md",
        filePath: "docs/indexing.md",
        fileSizeBytes: 200,
        mimeType: "text/markdown",
      },
      [
        {
          id: "chunk-adr-888",
          content: "We select the HNSW index to optimize nearest neighbor vector query latency.",
          embedding: dummyVector,
          tokensCount: 12,
          metadata: { category: "database" },
        }
      ]
    );

    // 4. Test missing query validation (400 Bad Request)
    console.log("[1] Testing bad request invalid parameters...");
    const badRequest = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const badResponse = await chatPOST(badRequest);
    console.log(`Bad request status: ${badResponse.status}`);
    if (badResponse.status !== 400) {
      throw new Error(`Expected status 400, got ${badResponse.status}`);
    }
    const badBody = await badResponse.json();
    if (badBody.success !== false || badBody.code !== "BAD_REQUEST") {
      throw new Error("Invalid error wrapper schema returned");
    }
    console.log("[PASS] Invalid payload rejected with standardized error schema.");

    // 5. Test successful authorized token stream (200 OK text/event-stream)
    console.log("[2] Testing successful SSE stream query...");
    const req = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mockToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: "Explain why we choose the HNSW index option?",
      }),
    });

    const res = await chatPOST(req);
    console.log(`Response status: ${res.status}`);
    console.log(`Response Content-Type: ${res.headers.get("Content-Type")}`);
    
    if (res.status !== 200 || res.headers.get("Content-Type") !== "text/event-stream") {
      throw new Error("Expected 200 OK with text/event-stream headers!");
    }

    // Read readable stream output
    const reader = res.body?.getReader();
    if (!reader) {
      throw new Error("Streaming Response body is null!");
    }

    const decoder = new TextDecoder();
    let result = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += decoder.decode(value);
    }

    console.log("Raw SSE Stream Results:");
    console.log(result);

    // Verify SSE lines structure: data: {"text": "..."}
    if (!result.includes("data: ") || !result.includes("HNSW index")) {
      throw new Error("Streaming SSE output did not contain valid json-data tokens or LLM chunks!");
    }

    console.log("[PASS] Progressive token streaming successfully completed.");
    console.log("\n=== ALL CHAT API INTEGRATION TESTS PASSED SUCCESSFULLY (100% SUCCESS) ===");
    process.exit(0);

  } catch (error: unknown) {
    console.error("Chat API integration test failed with error:");
    console.error(error instanceof Error ? error.stack : String(error));
    process.exit(1);
  }
}

runChatApiTests();

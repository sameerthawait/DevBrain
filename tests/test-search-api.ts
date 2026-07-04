import "dotenv/config";
import { db } from "../lib/db";
import * as schema from "../lib/db/schema";
import { saveDocumentAndChunks } from "../lib/rag/store";
import { GET as searchGET } from "../app/api/search/route";
import { NextRequest } from "next/server";

import { runMigrations } from "../lib/db/migrations";

async function runSearchApiTests() {
  console.log("=== STARTING SEARCH API INTEGRATION TESTS ===");

  try {
    // 0. Ensure schema tables are initialized
    await runMigrations();

    // 1. Setup clean data state
    await db.delete(schema.userSessions);
    await db.delete(schema.documents);
    await db.delete(schema.users);

    const [testUser] = await db.insert(schema.users).values({
      email: "api-tester@devbrain.ai",
    }).returning();

    // 2. Generate active session
    const mockToken = "secure_test_auth_token_456";
    await db.insert(schema.userSessions).values({
      userId: testUser.id,
      token: mockToken,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // expires in 1 hour
    });

    // 3. Save mock RAG documents
    const mockVector = new Array(768).fill(0).map((_, i) => i / 768.0);
    await saveDocumentAndChunks(
      testUser.id,
      {
        filename: "scaffold.md",
        filePath: "docs/scaffold.md",
        fileSizeBytes: 100,
        mimeType: "text/markdown",
      },
      [
        {
          id: "chunk-xyz",
          content: "Next.js 16 App Router configuration parameters.",
          embedding: mockVector,
          tokensCount: 10,
          metadata: { category: "framework" },
        }
      ]
    );

    // 4. Test validation limits (400 Bad Request)
    console.log("[1] Testing bad request validation (missing query parameter)...");
    const badRequest = new NextRequest("http://localhost:3000/api/search?limit=-5");
    const badResponse = await searchGET(badRequest);
    
    console.log(`Bad request status: ${badResponse.status}`);
    if (badResponse.status !== 400) {
      throw new Error(`Expected status 400, got ${badResponse.status}`);
    }
    const badBody = await badResponse.json();
    if (!badBody.message.includes("Invalid query parameters")) {
      throw new Error("Invalid error payload structure on 400 validation");
    }
    console.log("[PASS] Validation checks rejected bad parameters correctly.");

    // 5. Test authentication checks (401 Unauthorized)
    console.log("[2] Testing unauthorized access request...");
    const unauthRequest = new NextRequest("http://localhost:3000/api/search?query=scaffold");
    const unauthResponse = await searchGET(unauthRequest);
    
    console.log(`Unauthorized status: ${unauthResponse.status}`);
    if (unauthResponse.status !== 401) {
      throw new Error(`Expected status 401, got ${unauthResponse.status}`);
    }
    console.log("[PASS] Request without Authorization header was rejected.");

    // 6. Test successful authorized search query (200 OK)
    console.log("[3] Testing successful authorized search query...");
    const req = new NextRequest("http://localhost:3000/api/search?query=scaffold&limit=5", {
      headers: {
        Authorization: `Bearer ${mockToken}`,
      },
    });

    const res = await searchGET(req);
    console.log(`Search response status: ${res.status}`);
    if (res.status !== 200) {
      throw new Error(`Expected status 200, got ${res.status}`);
    }

    const body = await res.json();
    console.log(`Retrieved results count: ${body.count}`);
    if (body.count === 0) {
      throw new Error("Retrieval returned empty results for valid authorized search!");
    }
    
    body.results.forEach((chunk: import("../lib/rag/retrieve").RetrievedChunk) => {
      console.log(`- Retrieved Chunk Content: "${chunk.content}"`);
      if (chunk.documentId === undefined || chunk.filePath === undefined) {
        throw new Error("Retrieved results did not contain correct document context");
      }
    });

    console.log("[PASS] Search API endpoint executed and validated successfully.");
    console.log("\n=== ALL SEARCH API INTEGRATION TESTS PASSED SUCCESSFULLY (100% SUCCESS) ===");
    process.exit(0);

  } catch (error: unknown) {
    console.error("Search API integration test failed with error:");
    console.error(error instanceof Error ? error.stack : String(error));
    process.exit(1);
  }
}

runSearchApiTests();

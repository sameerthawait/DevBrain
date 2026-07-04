import { classifyIntent } from "../lib/agents/intent-classifier";

async function testIntentClassifier() {
  console.log("=== STARTING INTENT CLASSIFIER UNIT TESTS ===");

  const testCases = [
    { query: "Remember that the database has a 2s connection timeout", expected: "Save Memory" },
    { query: "Summarize the architecture decision record for caching", expected: "Summarize" },
    { query: "What was the ADR decision for the vector indexing engine?", expected: "Decision Lookup" },
    { query: "How is database connection pooling configured in the project?", expected: "Project Lookup" },
    { query: "Search for documentation on the parser selection strategy", expected: "Search" },
    { query: "Explain why we chose BullMQ instead of QStash", expected: "Explain" },
    { query: "Compare performance of HNSW vs flat vector search", expected: "Compare" },
    { query: "Retrieve the notes about Sentry setup", expected: "Retrieve Memory" },
    { query: "Why is the test database dropping tables on run?", expected: "Ask" },
    { query: "random query syntax", expected: "Unknown" },
  ];

  for (const test of testCases) {
    const result = await classifyIntent(test.query);
    console.log(`Query: "${test.query}" -> Intent: ${result.intent} (confidence: ${result.confidence})`);
    if (result.intent !== test.expected) {
      throw new Error(`Intent mismatch! Expected: ${test.expected}, Got: ${result.intent}`);
    }
  }

  console.log("=== ALL INTENT CLASSIFIER UNIT TESTS PASSED SUCCESSFULLY ===");
}

testIntentClassifier();

import { PlainTextParser } from "../lib/rag/parsers/plain-text";
import { parserRegistry } from "../lib/rag/parsers/registry";
import { chunkText, generateStableId } from "../lib/rag/chunk";

function runTests() {
  console.log("=== STARTING RAG SYSTEM UNIT TESTS ===");

  // 1. Parser Tests
  console.log("[TEST 1] Testing PlainTextParser...");
  const parser = parserRegistry.getParserForMimeType("text/plain");
  if (!(parser instanceof PlainTextParser)) {
    throw new Error("Parser registry did not return PlainTextParser for text/plain");
  }

  const sampleText = "Hello World!\nThis is a RAG pipeline check.";
  const parseResult = parser.parse(Buffer.from(sampleText));
  
  parseResult.then((res) => {
    if (res.content !== sampleText) {
      throw new Error(`Parsed content mismatch: expected "${sampleText}", got "${res.content}"`);
    }
    if (res.metadata.charCount !== sampleText.length) {
      throw new Error("Metadata character count mismatch");
    }
    console.log("[PASS] PlainTextParser validated successfully.");

    // 2. Chunking Tests
    console.log("[TEST 2] Testing chunkText logic...");
    const metadata = { docTitle: "Sample Document" };
    
    // Test empty content
    const emptyChunks = chunkText("", metadata);
    if (emptyChunks.length !== 0) {
      throw new Error("Empty content should return empty chunk array");
    }

    // Test normal content chunking
    const longText = "Paragraph 1: " + "A".repeat(800) + "\n\nParagraph 2: " + "B".repeat(800) + "\n\nParagraph 3: " + "C".repeat(800);
    const normalChunks = chunkText(longText, metadata, "doc-123");
    
    if (normalChunks.length < 2) {
      throw new Error(`Expected at least 2 chunks, got ${normalChunks.length}`);
    }

    // Verify metadata preservation and token estimation
    normalChunks.forEach((chunk, index) => {
      if (chunk.metadata.docTitle !== "Sample Document") {
        throw new Error("Metadata preservation failed in chunk");
      }
      if (typeof chunk.metadata.tokensCount !== "number" || chunk.metadata.tokensCount <= 0) {
        throw new Error("Tokens count estimation is invalid");
      }
      if (chunk.metadata.chunkIndex !== index) {
        throw new Error("Chunk index metadata is invalid");
      }
      
      // Stable ID verification
      const expectedId = generateStableId(chunk.content, "doc-123");
      if (chunk.id !== expectedId) {
        throw new Error("Chunk stable ID generator is not deterministic");
      }
    });

    // Test extremely long single line boundary handling
    const longLine = "D".repeat(4000);
    const lineChunks = chunkText(longLine, metadata);
    if (lineChunks.length < 2) {
      throw new Error("Extremely long lines should be split into multiple chunks");
    }

    // Test Unicode and Emoji support
    const unicodeText = "🌟 Multi-language test: 日本語, English, Español 🌟";
    const unicodeChunks = chunkText(unicodeText, metadata);
    if (unicodeChunks.length !== 1 || !unicodeChunks[0].content.includes("日本語")) {
      throw new Error("Unicode/Emoji content parsing failed");
    }

    console.log("[PASS] chunkText logic validated successfully.");
    console.log("=== ALL RAG SYSTEM UNIT TESTS PASSED SUCCESSFULLY (100% SUCCESS) ===");
    process.exit(0);
  }).catch((err) => {
    console.error("Test failed with error:", err);
    process.exit(1);
  });
}

runTests();

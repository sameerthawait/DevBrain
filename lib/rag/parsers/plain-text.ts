import { Parser, ParseResult } from "./types";

export class PlainTextParser implements Parser {
  public readonly supportedMimeTypes = ["text/plain"];

  public validate(content: Buffer | string): boolean {
    if (!content) return false;
    
    // For buffers, make sure it's valid UTF-8 string data (not binary garbage)
    if (Buffer.isBuffer(content)) {
      const text = content.toString("utf-8");
      // Check for zero-byte chars which typically indicate binary data
      return !text.includes("\u0000");
    }
    
    return true;
  }

  public async parse(content: Buffer | string): Promise<ParseResult> {
    if (!this.validate(content)) {
      throw new Error("Invalid plain text content provided for parsing.");
    }

    const textContent = Buffer.isBuffer(content) ? content.toString("utf-8") : content;
    const lines = textContent.split(/\r?\n/);

    return {
      content: textContent,
      metadata: {
        charCount: textContent.length,
        lineCount: lines.length,
        sizeBytes: Buffer.isBuffer(content) ? content.length : Buffer.byteLength(textContent, "utf-8"),
        parserType: "plain-text",
      },
    };
  }
}

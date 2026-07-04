import { Parser } from "./types";
import { PlainTextParser } from "./plain-text";

export class ParserRegistry {
  private parsers = new Map<string, Parser>();

  constructor() {
    // Register default parsers
    this.register(new PlainTextParser());
  }

  /**
   * Register a new parser type in the system.
   * Enables extension points for Markdown, DOCX, Source Code, HTML, and PDFs.
   */
  public register(parser: Parser): void {
    for (const mimeType of parser.supportedMimeTypes) {
      this.parsers.set(mimeType.toLowerCase(), parser);
    }
  }

  /**
   * Retrieve the parser registered for a specific MIME type.
   */
  public getParserForMimeType(mimeType: string): Parser {
    const parser = this.parsers.get(mimeType.toLowerCase());
    if (!parser) {
      throw new Error(`Unsupported MIME type: ${mimeType}`);
    }
    return parser;
  }
}

export const parserRegistry = new ParserRegistry();

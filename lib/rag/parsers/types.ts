export interface ParseResult {
  content: string;
  metadata: Record<string, unknown>;
}

export interface Parser {
  supportedMimeTypes: string[];
  validate(content: Buffer | string): boolean;
  parse(content: Buffer | string): Promise<ParseResult>;
}

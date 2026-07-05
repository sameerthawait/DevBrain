import { createHash } from "crypto";

export interface Chunk {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
}

const CHARS_PER_TOKEN = 4; // Approximating 1 token = 4 characters
const TARGET_CHUNK_SIZE = 400 * CHARS_PER_TOKEN; // 1600 characters
const OVERLAP_SIZE = 50 * CHARS_PER_TOKEN; // 200 characters

/**
 * Generate a deterministic UUID-style hash from the text content and optional document ID.
 */
export function generateStableId(content: string, documentId?: string): string {
  const hash = createHash("sha256")
    .update(content + (documentId || ""))
    .digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

/**
 * Chunk a document's text content into semantic, overlapping passages.
 * Preserves paragraph boundaries where practical and guarantees deterministic stable IDs.
 */
export function chunkText(
  content: string,
  metadata: Record<string, unknown>,
  documentId?: string
): Chunk[] {
  if (!content || content.trim().length === 0) {
    return [];
  }

  const normalized = content.replace(/\r\n/g, "\n");
  const paragraphs = normalized.split("\n\n");
  const chunks: Chunk[] = [];

  let currentChunkText = "";
  let i = 0;

  while (i < paragraphs.length) {
    const paragraph = paragraphs[i];
    
    // Handle extremely large paragraphs by breaking them down into lines
    if (paragraph.length > TARGET_CHUNK_SIZE) {
      // If there is accumulated text, flush it first
      if (currentChunkText.trim().length > 0) {
        chunks.push(createChunkObj(currentChunkText, metadata, chunks.length, documentId));
        currentChunkText = "";
      }

      const lines = paragraph.split("\n");
      let j = 0;
      while (j < lines.length) {
        const line = lines[j];

        // Handle single extremely long line by slicing characters
        if (line.length > TARGET_CHUNK_SIZE) {
          if (currentChunkText.trim().length > 0) {
            chunks.push(createChunkObj(currentChunkText, metadata, chunks.length, documentId));
            currentChunkText = "";
          }

          let start = 0;
          while (start < line.length) {
            const end = Math.min(start + TARGET_CHUNK_SIZE, line.length);
            const slice = line.slice(start, end);
            chunks.push(createChunkObj(slice, metadata, chunks.length, documentId));
            // Shift start window by target size minus overlap
            start += (TARGET_CHUNK_SIZE - OVERLAP_SIZE);
            if (start >= line.length || (TARGET_CHUNK_SIZE - OVERLAP_SIZE) <= 0) break;
          }
          j++;
          continue;
        }

        if ((currentChunkText + "\n" + line).length > TARGET_CHUNK_SIZE) {
          if (currentChunkText.trim().length > 0) {
            chunks.push(createChunkObj(currentChunkText, metadata, chunks.length, documentId));
          }
          // Backtrack line for overlap
          currentChunkText = line;
        } else {
          currentChunkText = currentChunkText ? currentChunkText + "\n" + line : line;
        }
        j++;
      }
      i++;
      continue;
    }

    if ((currentChunkText + "\n\n" + paragraph).length > TARGET_CHUNK_SIZE) {
      if (currentChunkText.trim().length > 0) {
        chunks.push(createChunkObj(currentChunkText, metadata, chunks.length, documentId));
      }

      // Backtrack: start the next chunk with the current paragraph
      currentChunkText = paragraph;
    } else {
      currentChunkText = currentChunkText ? currentChunkText + "\n\n" + paragraph : paragraph;
    }
    i++;
  }

  // Flush remaining text
  if (currentChunkText.trim().length > 0) {
    chunks.push(createChunkObj(currentChunkText, metadata, chunks.length, documentId));
  }

  return chunks;
}

function createChunkObj(
  content: string,
  metadata: Record<string, unknown>,
  index: number,
  documentId?: string
): Chunk {
  const trimmed = content.trim();
  const tokensCount = Math.ceil(trimmed.length / CHARS_PER_TOKEN);
  
  return {
    id: generateStableId(trimmed, documentId || `chunk-${index}`),
    content: trimmed,
    metadata: {
      ...metadata,
      chunkIndex: index,
      tokensCount,
    },
  };
}

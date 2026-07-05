import { RetrievedChunk } from "../rag/retrieve";

export interface ContextBuilderOptions {
  maxCharacters?: number; // approximate token accounting representation
}

/**
 * Clean, deduplicate, and format retrieved vector document chunks into delimited context sections.
 */
export function buildRetrievalContext(
  chunks: RetrievedChunk[],
  options: ContextBuilderOptions = {}
): string {
  const maxChars = options.maxCharacters || 10000;
  
  // Deduplicate chunks by ID
  const seenIds = new Set<string>();
  const uniqueChunks = chunks.filter((chunk) => {
    if (seenIds.has(chunk.id)) return false;
    seenIds.add(chunk.id);
    return true;
  });

  let context = "";
  for (const chunk of uniqueChunks) {
    const section = `[Source: ${chunk.filename} (Path: ${chunk.filePath}) (Citation ID: ${chunk.id})]\n${chunk.content}\n\n`;
    
    // Check if adding this section exceeds characters budget
    if (context.length + section.length > maxChars) {
      break;
    }
    context += section;
  }

  return context.trim();
}

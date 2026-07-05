import { db } from "../db";
import * as schema from "../db/schema";
import { logger } from "../logger";

export interface SaveChunkInput {
  id: string;
  content: string;
  embedding: number[];
  tokensCount: number;
  metadata: Record<string, unknown>;
}

export interface SaveDocumentInput {
  filename: string;
  filePath: string;
  fileSizeBytes: number;
  mimeType: string;
}

/**
 * Saves a document and all its associated semantic chunks with vector embeddings in a single atomic database transaction.
 * 
 * Transactional Guarantees:
 * - Atomicity: Either the document record and all of its chunks are successfully written, or nothing is written.
 * - Integrity: Prevents orphaned chunk rows referencing a non-existent document.
 * - Rollback behavior: Any failure during chunk or document insertion triggers an automatic rollback of the transaction.
 */
export async function saveDocumentAndChunks(
  userId: string,
  docInput: SaveDocumentInput,
  chunksInput: SaveChunkInput[]
): Promise<string> {
  logger.info({
    msg: "Starting atomic storage transaction for RAG ingestion",
    userId,
    filename: docInput.filename,
    chunksCount: chunksInput.length,
  });

  try {
    const documentId = await db.transaction(async (tx) => {
      // 1. Insert parent document record
      const [insertedDoc] = await tx.insert(schema.documents).values({
        userId,
        filename: docInput.filename,
        filePath: docInput.filePath,
        fileSizeBytes: docInput.fileSizeBytes,
        mimeType: docInput.mimeType,
      }).returning();

      // 2. Insert child chunk records referencing the document
      if (chunksInput.length > 0) {
        await tx.insert(schema.chunks).values(
          chunksInput.map((chunk) => ({
            id: chunk.id,
            documentId: insertedDoc.id,
            content: chunk.content,
            tokensCount: chunk.tokensCount,
            embedding: chunk.embedding,
            metadata: chunk.metadata,
          }))
        );
      }

      return insertedDoc.id;
    });

    logger.info({
      msg: "RAG ingestion storage transaction committed successfully",
      documentId,
    });

    return documentId;
  } catch (error: unknown) {
    logger.error({
      msg: "RAG Ingestion storage transaction aborted. Automatic rollback executed.",
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

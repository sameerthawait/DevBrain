import { Worker, Job } from "bullmq";
import { logger } from "../logger";
import { parserRegistry } from "../rag/parsers/registry";
import { chunkText } from "../rag/chunk";
import { embedChunks } from "../rag/embed";
import { saveDocumentAndChunks } from "../rag/store";
import { classifyDecision } from "../rag/decision-classifier";
import { persistCostLog } from "../rag/cost";
import * as schema from "../db/schema";
import { db } from "../db";
import { getBullMQConnection } from "./redis";





export const ingestionWorker = new Worker(
  "rag-ingestion",
  async (job: Job) => {
    const startTime = Date.now();
    const { userId, docInput, fileContent } = job.data;

    logger.info({
      msg: "Background ingestion worker processing job",
      jobId: job.id,
      filename: docInput.filename,
    });

    try {
      // 1. Resolve parser and parse
      const parser = parserRegistry.getParserForMimeType(docInput.mimeType);
      const parsed = await parser.parse(fileContent);

      // 2. Chunk text
      const chunks = chunkText(parsed.content, parsed.metadata, docInput.filePath);
      if (chunks.length === 0) {
        logger.info(`No chunks generated for file: ${docInput.filename}. Skipping.`);
        return { status: "skipped", reason: "empty_content" };
      }

      // 3. Generate embeddings
      const contents = chunks.map((c) => c.content);
      const embeddings = await embedChunks(contents);

      let totalTokens = 0;
      const validChunksInput = [];

      // 4. Classify chunks & build insertion array
      for (let idx = 0; idx < chunks.length; idx++) {
        const chunk = chunks[idx];
        const vector = embeddings[idx];

        if (!vector) {
          logger.warn(`Skipping chunk index ${idx} due to embedding generation failure.`);
          continue;
        }

        const tokens =
          typeof chunk.metadata.tokensCount === "number"
            ? chunk.metadata.tokensCount
            : 0;
        totalTokens += tokens;

        // Classify engineering decisions
        const classification = await classifyDecision(chunk.content);

        console.log("==================================");
        console.log("CLASSIFICATION RESULT");
        console.log(classification);
        console.log("==================================");

        logger.info({
          msg: "Decision classification",
          decisionType: classification.decisionType,
          confidence: classification.confidence,
          matchedRules: classification.matchedRules,
        });

        // Merge decision details into chunk metadata
        const enrichedMetadata = {
          ...chunk.metadata,
          decisionClassification: {
            decisionType: classification.decisionType,
            confidence: classification.confidence,
            matchedRules: classification.matchedRules,
            extractedMetadata: classification.extractedMetadata,
          },
        };

        validChunksInput.push({
          id: chunk.id,
          content: chunk.content,
          embedding: vector,
          tokensCount: tokens,
          metadata: enrichedMetadata,
        });

        // 5. If it is a clear engineering decision, also insert as a semantic memory record
        if (classification.decisionType !== "Unknown" && classification.confidence >= 0.7) {
          console.log(">>> ENTERED DECISION INSERT <<<");

          try {
            await db.insert(schema.userMemories).values({
              userId,
              type: "decision",
              factContent: `Extracted Engineering Decision (${classification.decisionType}): ${chunk.content.slice(
                0,
                200
              )}`,
              embedding: vector,
              metadata: {
                source: docInput.filePath,
                decisionType: classification.decisionType,
                confidence: classification.confidence,
                matchedRules: classification.matchedRules,
              },
            });
          } catch (err: unknown) {
            logger.error({ err }, "Extracted engineering decision memory insertion failed");
          }
        }
      }

      // 6. Save atomically to database
      if (validChunksInput.length > 0) {
        await saveDocumentAndChunks(userId, docInput, validChunksInput);
      }

      // 7. Perform token cost tracking
      const latency = Date.now() - startTime;
      await persistCostLog(userId, {
        embeddingTokens: totalTokens,
        provider: "NVIDIA NIM",
        model: "nvidia/canonical-embeddings",
        latencyMs: latency,
      });

      logger.info({
        msg: "Background ingestion job completed successfully",
        jobId: job.id,
        processedChunks: validChunksInput.length,
      });

      return {
        status: "completed",
        documentName: docInput.filename,
        chunksProcessed: validChunksInput.length,
      };
        } catch (err: unknown) {
          logger.error({
            msg: `Ingestion job worker error for job ${job.id}`,
            error: err instanceof Error ? err.message : String(err),
          });
          throw err;
        }
      },
      {
        connection: getBullMQConnection(),
          concurrency: 2, // process up to 2 ingestion tasks in parallel
  }
);

// Graceful shutdown handling
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received. Starting graceful shutdown of BullMQ ingestion worker...");
  await ingestionWorker.close();
  logger.info("Ingestion worker shut down cleanly.");
});

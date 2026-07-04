import { Queue } from "bullmq";
import { logger } from "../logger";
import { createHash } from "crypto";
import { SaveDocumentInput } from "../rag/store";
import { getBullMQConnection } from "./redis";

export const ingestionQueue = new Queue("rag-ingestion", {
  connection: getBullMQConnection(),
  defaultJobOptions: {
    attempts: 3,

    backoff: {
      type: "exponential",
      delay: 5000,
    },

    removeOnComplete: true,
    removeOnFail: false,
  },
});

export interface IngestionJobPayload {
  userId: string;
  docInput: SaveDocumentInput;
  fileContent: string;
}

export async function enqueueIngestionJob(
  userId: string,
  docInput: SaveDocumentInput,
  fileContent: string
): Promise<string> {
  const hash = createHash("sha256")
    .update(fileContent + userId + docInput.filePath)
    .digest("hex");

  logger.info({
    msg: "Enqueueing background ingestion job",
    userId,
    filename: docInput.filename,
    jobId: hash,
  });

  const job = await ingestionQueue.add(
    "process-document",
    {
      userId,
      docInput,
      fileContent,
    },
    {
      jobId: hash,
    }
  );

  return job.id ?? hash;
}
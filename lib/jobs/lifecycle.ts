import Redis from "ioredis";
import { env } from "../config/env";
import { logger } from "../logger";

export type JobState =
  | "queued"
  | "running"
  | "retrying"
  | "completed"
  | "failed"
  | "dead_letter";

export interface JobLifecycleMetadata {
  jobId: string;
  userId: string;
  projectId?: string;
  conversationId?: string;
  requestId?: string;
  contentHash: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  retryCount: number;
  failureReason?: string;
  state: JobState;
}

const getRedisConfig = () => {
  const url = new URL(env.UPSTASH_REDIS_REST_URL);
  return {
    host: url.hostname,
    port: 6379,
    password: env.UPSTASH_REDIS_REST_TOKEN,
    tls: {},
  };
};

// Lazy initialize standard ioredis client
let redisClient: Redis | null = null;
function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(getRedisConfig());
  }
  return redisClient;
}

const METADATA_KEY_PREFIX = "job-metadata:";

/**
 * Get job metadata from Redis
 */
export async function getJobMetadata(jobId: string): Promise<JobLifecycleMetadata | null> {
  const client = getRedisClient();
  const data = await client.get(`${METADATA_KEY_PREFIX}${jobId}`);
  if (!data) return null;
  return JSON.parse(data) as JobLifecycleMetadata;
}

/**
 * Save or update job metadata in Redis
 */
export async function updateJobMetadata(
  jobId: string,
  updates: Partial<JobLifecycleMetadata> & { state: JobState }
): Promise<JobLifecycleMetadata> {
  const client = getRedisClient();
  const existing = await getJobMetadata(jobId);

  const merged: JobLifecycleMetadata = {
    jobId,
    userId: updates.userId || existing?.userId || "",
    projectId: updates.projectId || existing?.projectId,
    conversationId: updates.conversationId || existing?.conversationId,
    requestId: updates.requestId || existing?.requestId,
    contentHash: updates.contentHash || existing?.contentHash || "",
    createdAt: updates.createdAt || existing?.createdAt || new Date().toISOString(),
    startedAt: updates.startedAt || existing?.startedAt,
    completedAt: updates.completedAt || existing?.completedAt,
    retryCount: updates.retryCount !== undefined ? updates.retryCount : (existing?.retryCount || 0),
    failureReason: updates.failureReason || existing?.failureReason,
    state: updates.state,
  };

  await client.set(`${METADATA_KEY_PREFIX}${jobId}`, JSON.stringify(merged), "EX", 60 * 60 * 24 * 7); // 7 days TTL

  logger.info({
    msg: `Job transition state change`,
    jobId,
    previousState: existing?.state || "none",
    currentState: updates.state,
    retryCount: merged.retryCount,
  });

  return merged;
}

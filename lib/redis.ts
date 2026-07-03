import { Redis } from "@upstash/redis";
import { env } from "./config/env";

// Ensure global type declaration for development hot-reloading singleton caching
declare global {
  var globalRedis: Redis | undefined;
}

/**
 * Singleton Upstash Redis client.
 * Uses HTTP REST calls under the hood, making it fully safe for serverless/edge environments
 * without maintaining open TCP sockets. Connection pooling is managed on the Upstash REST gateway.
 */
export const redis = globalThis.globalRedis ?? new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

if (process.env.NODE_ENV !== "production") {
  globalThis.globalRedis = redis;
}

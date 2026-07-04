import { redis } from "./redis";
import { logger } from "./logger";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Sliding window rate limiting implementation using Upstash Redis.
 * Default limit is 20 requests per minute.
 */
export async function checkRateLimit(
  userId: string,
  limit = 20,
  windowSeconds = 60
): Promise<RateLimitResult> {
  const key = `ratelimit:${userId}`;
  const now = Date.now();
  const clearBefore = now - windowSeconds * 1000;

  try {
    const pipeline = redis.pipeline();
    // Remove expired timestamps from sorted set
    pipeline.zremrangebyscore(key, 0, clearBefore);
    // Add current timestamp
    pipeline.zadd(key, { score: now, member: String(now) });
    // Retrieve count in the active window
    pipeline.zcard(key);
    // Refresh key TTL to prevent lingering sorted sets
    pipeline.expire(key, windowSeconds);

    const results = await pipeline.exec();
    
    // ZCARD result is index 2 in pipeline exec results array
    const currentCount = (results[2] as number) || 0;

    const allowed = currentCount <= limit;
    const remaining = Math.max(0, limit - currentCount);

    let retryAfterSeconds = 0;
    if (!allowed) {
      // Find oldest active timestamp to calculate retry offset
      const oldestTimestamps = await redis.zrange<string[]>(key, 0, 0);
      const oldest = oldestTimestamps[0] ? parseInt(oldestTimestamps[0], 10) : now;
      retryAfterSeconds = Math.ceil((oldest + windowSeconds * 1000 - now) / 1000);
    }

    return { allowed, remaining, retryAfterSeconds };

  } catch (err: unknown) {
    logger.error({ msg: "Rate limiter failed, allowing request to bypass", error: String(err) });
    // Soft fallback: allow query in case of Redis outage to ensure system availability
    return { allowed: true, remaining: 1, retryAfterSeconds: 0 };
  }
}

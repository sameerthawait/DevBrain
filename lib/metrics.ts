import { redis } from "./redis";
import { logger } from "./logger";

/**
 * Serverless-safe metrics tracker.
 * Instead of local memory counters, which are reset on container recycling,
 * this client writes metrics to Upstash Redis to maintain global telemetry.
 */
export class MetricsCollector {
  private static PREFIX = "telemetry:metrics";

  /**
   * Records request duration in milliseconds.
   */
  static async recordRequestDuration(route: string, durationMs: number): Promise<void> {
    try {
      const p = this.PREFIX;
      await Promise.all([
        redis.hincrby(`${p}:request_count`, route, 1),
        redis.hincrby(`${p}:request_duration_sum`, route, Math.round(durationMs)),
      ]);
    } catch (error) {
      logger.error({ error, route, durationMs }, "Failed to record request duration metric");
    }
  }

  /**
   * Increments cache hits.
   */
  static async recordCacheHit(cacheType: string = "redis"): Promise<void> {
    try {
      await redis.incr(`${this.PREFIX}:cache_hits:${cacheType}`);
    } catch (error) {
      logger.error({ error, cacheType }, "Failed to record cache hit metric");
    }
  }

  /**
   * Increments cache misses.
   */
  static async recordCacheMiss(cacheType: string = "redis"): Promise<void> {
    try {
      await redis.incr(`${this.PREFIX}:cache_misses:${cacheType}`);
    } catch (error) {
      logger.error({ error, cacheType }, "Failed to record cache miss metric");
    }
  }

  /**
   * Exports metrics in Prometheus Exposition Format.
   */
  static async exportPrometheusMetrics(): Promise<string> {
    try {
      const p = this.PREFIX;
      
      // Fetch all metrics in parallel
      const [
        requestCounts,
        durationSums,
        cacheHits,
        cacheMisses,
      ] = await Promise.all([
        redis.hgetall(`${p}:request_count`) as Promise<Record<string, string> | null>,
        redis.hgetall(`${p}:request_duration_sum`) as Promise<Record<string, string> | null>,
        redis.get(`${p}:cache_hits:redis`) as Promise<string | null>,
        redis.get(`${p}:cache_misses:redis`) as Promise<string | null>,
      ]);

      const lines: string[] = [];

      // 1. Request counts & durations
      lines.push("# HELP devbrain_http_requests_total Total number of HTTP requests");
      lines.push("# TYPE devbrain_http_requests_total counter");
      if (requestCounts) {
        for (const [route, val] of Object.entries(requestCounts)) {
          lines.push(`devbrain_http_requests_total{route="${route}"} ${val}`);
        }
      }

      lines.push("# HELP devbrain_http_request_duration_seconds_sum Sum of request durations in seconds");
      lines.push("# TYPE devbrain_http_request_duration_seconds_sum counter");
      if (durationSums) {
        for (const [route, val] of Object.entries(durationSums)) {
          const seconds = parseFloat(val) / 1000.0;
          lines.push(`devbrain_http_request_duration_seconds_sum{route="${route}"} ${seconds.toFixed(4)}`);
        }
      }

      // 2. Cache metrics
      const hits = parseInt(cacheHits || "0", 10);
      const misses = parseInt(cacheMisses || "0", 10);
      const totalCacheRequests = hits + misses;
      const hitRatio = totalCacheRequests > 0 ? hits / totalCacheRequests : 0;

      lines.push("# HELP devbrain_cache_hits_total Total cache hits");
      lines.push("# TYPE devbrain_cache_hits_total counter");
      lines.push(`devbrain_cache_hits_total{type="redis"} ${hits}`);

      lines.push("# HELP devbrain_cache_misses_total Total cache misses");
      lines.push("# TYPE devbrain_cache_misses_total counter");
      lines.push(`devbrain_cache_misses_total{type="redis"} ${misses}`);

      lines.push("# HELP devbrain_cache_hit_ratio Cache hit ratio (hits / total requests)");
      lines.push("# TYPE devbrain_cache_hit_ratio gauge");
      lines.push(`devbrain_cache_hit_ratio{type="redis"} ${hitRatio.toFixed(4)}`);

      return lines.join("\n") + "\n";
    } catch (error) {
      logger.error({ error }, "Failed to export prometheus metrics");
      return "# Error generating metrics\n";
    }
  }
}

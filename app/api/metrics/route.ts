import { MetricsCollector } from "@/lib/metrics";
import { withLogging } from "@/lib/request-handler";

async function metricsHandler() {
  const start = Date.now();
  const metrics = await MetricsCollector.exportPrometheusMetrics();
  
  // Track latency of the metrics endpoint request itself
  await MetricsCollector.recordRequestDuration("/api/metrics", Date.now() - start);

  return new Response(metrics, {
    headers: {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
    },
  });
}

export const GET = withLogging(metricsHandler);

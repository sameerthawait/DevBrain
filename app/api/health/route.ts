import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { env } from "@/lib/config/env";
import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/request-handler";

async function healthHandler() {
  const timestamp = new Date().toISOString();

  // 1. Database connection check
  let dbStatus = "healthy";
  let dbLatency = 0;
  let dbError: string | null = null;
  try {
    const start = Date.now();
    await db.execute(sql`SELECT 1`);
    dbLatency = Date.now() - start;
  } catch (error: unknown) {
    dbStatus = "unhealthy";
    dbError = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error }, "Health check database connection check failed");
  }

  // 2. NVIDIA NIM connection check
  let nvidiaStatus = "healthy";
  let nvidiaLatency = 0;
  let nvidiaError: string | null = null;
  try {
    const start = Date.now();
    const response = await fetch(`${env.NVIDIA_BASE_URL}/models`, {
      headers: {
        Authorization: `Bearer ${env.NVIDIA_API_KEY}`,
      },
      signal: AbortSignal.timeout(5000), // Enforce 5s health check timeout
    });
    if (!response.ok) {
      throw new Error(`NVIDIA API responded with status ${response.status}: ${response.statusText}`);
    }
    nvidiaLatency = Date.now() - start;
  } catch (error: unknown) {
    nvidiaStatus = "unhealthy";
    nvidiaError = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error }, "Health check NVIDIA NIM connectivity check failed");
  }

  const isOverallHealthy = dbStatus === "healthy" && nvidiaStatus === "healthy";

  const statusReport = {
    status: isOverallHealthy ? "healthy" : "unhealthy",
    timestamp,
    services: {
      application: "healthy",
      database: {
        status: dbStatus,
        latencyMs: dbLatency,
        error: dbError,
      },
      nvidia: {
        status: nvidiaStatus,
        latencyMs: nvidiaLatency,
        error: nvidiaError,
      },
    },
  };

  // We explicitly return a Response object to match withLogging signature
  return new Response(JSON.stringify(statusReport), {
    status: isOverallHealthy ? 200 : 503,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export const GET = withLogging(healthHandler);

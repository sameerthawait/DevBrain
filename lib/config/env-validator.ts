import { logger } from "../logger";

const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "REDIS_URL",
  "NVIDIA_API_KEY",
  "NVIDIA_BASE_URL",
];

/**
 * Validate all required environment variables on startup.
 * Throws an error immediately to fail fast in production.
 */
export function validateEnvironment(): void {
  const missing: string[] = [];

  for (const key of REQUIRED_ENV_VARS) {
    const val = process.env[key];
    if (!val || val.trim() === "" || val.includes("placeholder")) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    const errorMsg = `CRITICAL CONFIGURATION ERROR: Missing required environment variables: ${missing.join(", ")}`;
    logger.error({ msg: errorMsg });
    throw new Error(errorMsg);
  }

  logger.info({ msg: "Startup environment validation checks completed successfully." });
}

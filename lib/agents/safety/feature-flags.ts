import { logger } from "../../logger";

export interface FeatureFlagsConfig {
  AGENT_ENABLED: boolean;
  SYNTHESIS_ENABLED: boolean;
  STREAMING_ENABLED: boolean;
  MEMORY_WRITES_ENABLED: boolean;
  DECISION_CLASSIFICATION_ENABLED: boolean;
  KILL_SWITCH_ACTIVE: boolean;
}

// Default values: configurable via environment variables
const defaultFlags: FeatureFlagsConfig = {
  AGENT_ENABLED: process.env.AGENT_ENABLED !== "false",
  SYNTHESIS_ENABLED: process.env.SYNTHESIS_ENABLED !== "false",
  STREAMING_ENABLED: process.env.STREAMING_ENABLED !== "false",
  MEMORY_WRITES_ENABLED: process.env.MEMORY_WRITES_ENABLED !== "false",
  DECISION_CLASSIFICATION_ENABLED: process.env.DECISION_CLASSIFICATION_ENABLED !== "false",
  KILL_SWITCH_ACTIVE: process.env.KILL_SWITCH_ACTIVE === "true",
};

/**
 * Resolve feature flag values dynamically.
 */
export async function getFeatureFlag<K extends keyof FeatureFlagsConfig>(flagName: K): Promise<boolean> {
  const value = defaultFlags[flagName];
  logger.info({ msg: "Feature flag resolved", flag: flagName, value });
  return value;
}

/**
 * Deterministic hashing utility to distribute users into percentage buckets [0-99].
 */
function getHashBucket(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash) % 100;
}

/**
 * Resolve feature flags supporting percentage-based user rollouts.
 */
export async function getFeatureFlagForUser<K extends keyof FeatureFlagsConfig>(
  flagName: K,
  userId: string,
  rolloutPercentage = 100
): Promise<boolean> {
  const baseEnabled = await getFeatureFlag(flagName);
  if (!baseEnabled) return false;

  const bucket = getHashBucket(`${userId}:${flagName}`);
  const userEnabled = bucket < rolloutPercentage;

  logger.info({
    msg: "User percentage rollout resolved",
    flag: flagName,
    userId,
    bucket,
    rolloutPercentage,
    userEnabled,
  });

  return userEnabled;
}

/**
 * Configure feature flags dynamically at runtime (for debugging, tests, or administration).
 */
export function setFeatureFlagOverride<K extends keyof FeatureFlagsConfig>(flagName: K, value: boolean): void {
  defaultFlags[flagName] = value;
  logger.warn({ msg: "Runtime override configured for feature flag", flag: flagName, overrideValue: value });
}

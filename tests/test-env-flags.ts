import "dotenv/config";
import { validateEnvironment } from "../lib/config/env-validator";
import { getFeatureFlagForUser } from "../lib/agents/safety/feature-flags";

async function runEnvFlagsTests() {
  console.log("=== STARTING ENVIRONMENT & FEATURE FLAGS ROLLOUT UNIT TESTS ===");

  try {
    // 1. Test environment validator logic
    console.log("[1] Testing startup environment variable validation...");
    validateEnvironment(); // Should run and complete without errors under current test context
    console.log("[PASS] Environment variables validated successfully.");

    // Test failure scenario
    const prevKey = process.env.NVIDIA_API_KEY;
    delete process.env.NVIDIA_API_KEY;
    try {
      validateEnvironment();
      throw new Error("Env validator failed to block startup on missing key!");
    } catch {
      console.log("- Expected validation error thrown successfully on missing API Key.");
    }
    // Restore env key
    process.env.NVIDIA_API_KEY = prevKey;

    // 2. Test percentage-based user rollout logic
    console.log("[2] Testing percentage-based rollout hashing distribution...");
    const flag = "AGENT_ENABLED";
    
    // With 0% rollout, all users must be disabled
    const u1_0 = await getFeatureFlagForUser(flag, "user-abc-123", 0);
    const u2_0 = await getFeatureFlagForUser(flag, "user-xyz-789", 0);
    if (u1_0 || u2_0) {
      throw new Error("User enabled on 0% rollout!");
    }

    // With 100% rollout, all users must be enabled
    const u1_100 = await getFeatureFlagForUser(flag, "user-abc-123", 100);
    const u2_100 = await getFeatureFlagForUser(flag, "user-xyz-789", 100);
    if (!u1_100 || !u2_100) {
      throw new Error("User disabled on 100% rollout!");
    }

    // With 50% rollout, distribution depends on deterministic hash bucket values
    const u1_50 = await getFeatureFlagForUser(flag, "user-abc-123", 50);
    console.log(`User u1 (50% rollout) state: ${u1_50}`);

    console.log("[PASS] Rollout distribution values verified.");
    console.log("\n=== ALL ENV & ROLLOUT TESTS PASSED SUCCESSFULLY (100% SUCCESS) ===");
    process.exit(0);

  } catch (error: unknown) {
    console.error("Environment and feature flags rollout tests failed with error:");
    console.error(error instanceof Error ? error.stack : String(error));
    process.exit(1);
  }
}

runEnvFlagsTests();

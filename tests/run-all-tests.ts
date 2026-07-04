import { execSync } from "child_process";

async function runAllTests() {
  console.log("=== RUNNING ALL DEVBRAIN INTEGRATION TEST SUITES ===");

  const isCI = !!process.env.CI;

  const suites = isCI
    ? [
        "tests/test-db.ts",
        "tests/test-env-flags.ts",
      ]
    : [
        "tests/test-db.ts",
        "tests/test-agent-workflow.ts",
        "tests/test-deletion.ts",
        "tests/test-rate-limiter.ts",
        "tests/test-env-flags.ts",
        "tests/test-health.ts",
      ];

  let failed = false;

  for (const suite of suites) {
    console.log(`\n--------------------------------------------------`);
    console.log(`Running test suite: ${suite}`);
    console.log(`--------------------------------------------------`);
    try {
      execSync(`npx tsx ${suite}`, { stdio: "inherit" });
      console.log(`[PASS] Completed: ${suite}`);
    } catch {
      console.error(`[FAIL] Suite crashed: ${suite}`);
      failed = true;
    }
  }

  if (failed) {
    console.error("\n❌ Some test suites failed to run successfully!");
    process.exit(1);
  }

  console.log("\n=== ALL TEST SUITES COMPLETED SUCCESSFULLY ===");
  process.exit(0);
}

runAllTests();

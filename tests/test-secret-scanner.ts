import { scanContent, isForbiddenFile } from "../scripts/pre-commit-check";
import * as fs from "fs";
import * as path from "path";

function runTests() {
  console.log("=== SECRET SCANNER AUTOMATED TESTS ===\n");
  
  let allPassed = true;

  const runTestCase = (name: string, shouldPass: boolean, testFn: () => boolean) => {
    try {
      const result = testFn();
      if (result === shouldPass) {
        console.log(`[PASS] ${name}`);
      } else {
        console.log(`[FAIL] ${name} (Expected: ${shouldPass ? "PASS" : "FAIL"}, Got: ${result ? "PASS" : "FAIL"})`);
        allPassed = false;
      }
    } catch (error) {
      console.log(`[ERROR] ${name}:`, error);
      allPassed = false;
    }
  };

  // --- PASS TEST CASES ---
  console.log("Testing expected PASS cases:");
  
  // 1. lib/config/env.ts
  runTestCase("lib/config/env.ts content scan", true, () => {
    const filePath = path.join(__dirname, "../lib/config/env.ts");
    const content = fs.readFileSync(filePath, "utf8");
    return scanContent(content, "lib/config/env.ts").passed;
  });

  // 2. lib/redis.ts
  runTestCase("lib/redis.ts content scan", true, () => {
    const filePath = path.join(__dirname, "../lib/redis.ts");
    const content = fs.readFileSync(filePath, "utf8");
    return scanContent(content, "lib/redis.ts").passed;
  });

  // 3. README.md
  runTestCase("README.md skip validation", true, () => {
    const result = scanContent("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", "README.md");
    return result.passed;
  });

  // 4. docs/ directory paths
  runTestCase("docs/ ADR content skip validation", true, () => {
    const result = scanContent("postgresql://user:password@host/db", "docs/adr/0001-postgresql-provider.md");
    return result.passed;
  });

  // --- FAIL TEST CASES ---
  console.log("\nTesting expected FAIL cases:");

  // 1. Real NVIDIA key pattern
  runTestCase("NVIDIA key value detection", false, () => {
    const content = 'const key = "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";';
    return scanContent(content, "app/page.tsx").passed;
  });

  // 2. GitHub PAT pattern
  runTestCase("GitHub PAT detection", false, () => {
    const content = 'const token = "ghp_123456789012345678901234567890123456";';
    return scanContent(content, "lib/github.ts").passed;
  });

  // 3. AWS Key ID pattern
  runTestCase("AWS Access Key ID detection", false, () => {
    const content = 'const aws = "AKIAIOSFODNN7EXAMPLE";';
    return scanContent(content, "config/aws.ts").passed;
  });

  // 4. Postgres URL with password
  runTestCase("Postgres connection URL with password detection", false, () => {
    const content = 'const dbUrl = "postgresql://postgres:mysecretpassword@localhost:5432/db";';
    return scanContent(content, "lib/db.ts").passed;
  });

  // 5. Private Key pattern
  runTestCase("Private Key block detection", false, () => {
    const content = "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----";
    return scanContent(content, "certs/key.pem").passed;
  });

  // 6. Forbidden env files
  runTestCase(".env file block validation", false, () => {
    return !isForbiddenFile(".env") && !isForbiddenFile(".env.test") && !isForbiddenFile(".env.local");
  });

  console.log("");
  if (allPassed) {
    console.log("=== ALL TEST CASES PASSED SUCCESSFULLY ===");
    process.exit(0);
  } else {
    console.log("❌ SOME TEST CASES FAILED");
    process.exit(1);
  }
}

runTests();

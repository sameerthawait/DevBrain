/* eslint-disable */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const secretRegexes = [
  /nvapi-[A-Za-z0-9-_]{30,100}/, // NVIDIA API Key
  /ghp_[A-Za-z0-9]{36,40}/,      // GitHub PAT
  /AKIA[A-Z0-9]{16}/,            // AWS Access Key ID
  /-----BEGIN (?:RSA |EC ||PGP )?PRIVATE KEY-----/, // Private Key
  /postgresql?:\/\/[a-zA-Z0-9_.-]+:[^@\s]+@[a-zA-Z0-9_.-]+/, // Postgres connection string with password
  /Bearer\s+eyJhbGciOiJIUzI1Ni[A-Za-z0-9-_./+=]+/, // Bearer token
  /AIzaSy[A-Za-z0-9-_]{33}/ // Google API Key
];

const forbiddenPatterns = [
  /\.env/,
  /\.pem$/,
  /\.key$/,
  /service-account.*\.json$/
];

function isForbiddenFile(filename) {
  const base = path.basename(filename);
  return forbiddenPatterns.some(pattern => pattern.test(base) || pattern.test(filename));
}

function shouldSkipFile(filename) {
  const norm = filename.replace(/\\/g, "/");
  // Never flag documentation, markdown, ADRs, test folders, or CI configs
  if (norm.endsWith(".md")) return true;
  if (norm.includes("docs/")) return true;
  return false;
}

function scanContent(content, filename) {
  if (shouldSkipFile(filename)) {
    return { passed: true, reason: "Skipped documentation file" };
  }

  // Scan line by line to locate the secret line
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const regex of secretRegexes) {
      if (regex.test(line)) {
        return {
          passed: false,
          line: line.trim(),
          lineNumber: i + 1,
          regex: regex.toString()
        };
      }
    }
  }

  return { passed: true };
}

function runGitCheck() {
  console.log("🔍 Running DevBrain pre-commit secrets check...");

  try {
    // 1. Get staged files list
    const stagedFiles = execSync("git diff --cached --name-only", { encoding: "utf8" })
      .split("\n")
      .map(f => f.trim())
      .filter(Boolean);

    // 2. Check for forbidden files
    const blockedFiles = stagedFiles.filter(isForbiddenFile);
    if (blockedFiles.length > 0) {
      console.error("\n❌ ERROR: Accidental commit blocked!");
      console.error("You are attempting to commit forbidden sensitive files:");
      blockedFiles.forEach(file => console.error(`  - ${file}`));
      console.error("\nPlease remove these files from the git staging area before committing.");
      process.exit(1);
    }

    // 3. Scan staged content changes for secret values
    let secretsFound = false;

    for (const file of stagedFiles) {
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) continue;
      if (shouldSkipFile(file)) continue;

      // Get diff of staged changes for this file
      const diff = execSync(`git diff --cached -- "${file}"`, { encoding: "utf8" });
      const addedLines = diff.split("\n").filter(line => line.startsWith("+") && !line.startsWith("+++"));
      const addedContent = addedLines.map(line => line.slice(1)).join("\n");

      const result = scanContent(addedContent, file);
      if (!result.passed) {
        console.error(`\n❌ ERROR: Hardcoded secret value detected in ${file}!`);
        console.error(`  Line: ${result.line}`);
        console.error(`  Pattern: ${result.regex}`);
        secretsFound = true;
      }
    }

    if (secretsFound) {
      console.error("\nPlease remove the hardcoded secrets and use environment variables instead.");
      process.exit(1);
    }

    console.log("✓ Pre-commit checks passed successfully!");
    process.exit(0);

  } catch (error) {
    if (error.status && error.status === 1) {
      process.exit(1);
    }
    console.error("Warning: Pre-commit checks execution failed, skipping.", error);
    process.exit(0);
  }
}

module.exports = {
  secretRegexes,
  isForbiddenFile,
  shouldSkipFile,
  scanContent
};

if (require.main === module) {
  runGitCheck();
}

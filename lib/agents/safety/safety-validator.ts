import { logger } from "../../logger";

export type RiskLevel = "Low" | "Medium" | "High" | "Critical";

export interface SafetyResult {
  isSafe: boolean;
  riskScore: RiskLevel;
  matchedRules: string[];
}

const JAILBREAK_PATTERNS = [
  "ignore previous instructions",
  "ignore all previous",
  "act as system",
  "reveal hidden prompt",
  "reveal system prompt",
  "developer mode",
  "dan mode",
  "role override",
  "simulate administrator",
  "execute hidden instructions",
  "do anything now",
];

/**
 * Validate input query against jailbreak and prompt injection patterns, resolving risk scores.
 */
export async function validateSafety(query: string): Promise<SafetyResult> {
  const cleanQuery = query.toLowerCase().trim();
  const matchedRules: string[] = [];

  // 1. Validate prompt constraints (UTF-8, control characters, size limits)
  if (query.length > 5000) {
    logger.warn({ msg: "Safety validation blocked: query too long", queryLength: query.length });
    return {
      isSafe: false,
      riskScore: "Critical",
      matchedRules: ["maximum_length_exceeded"],
    };
  }

  // Detect control characters (ASCII 0-31 except tab/newline)
  const hasControlChars = /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(query);
  if (hasControlChars) {
    logger.warn({ msg: "Safety validation blocked: control characters detected" });
    return {
      isSafe: false,
      riskScore: "Critical",
      matchedRules: ["control_characters_detected"],
    };
  }

  // 2. Jailbreak and Prompt Injection heuristics checking
  let riskScore: RiskLevel = "Low";
  for (const pattern of JAILBREAK_PATTERNS) {
    if (cleanQuery.includes(pattern)) {
      matchedRules.push(`jailbreak:${pattern.replace(/\s+/g, "_")}`);
      riskScore = "High";
    }
  }

  // Double down on critical overrides
  if (cleanQuery.includes("ignore previous instructions") || cleanQuery.includes("system prompt")) {
    riskScore = "Critical";
  }

  const isSafe = riskScore !== "High" && riskScore !== "Critical";

  logger.info({
    msg: "Safety check evaluated",
    isSafe,
    riskScore,
    matchedRules,
  });

  return { isSafe, riskScore, matchedRules };
}

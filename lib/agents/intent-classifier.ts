import { logger } from "../logger";
import { rules } from "../prompts/classification/intent-v1";

export type Intent =
  | "Ask"
  | "Save Memory"
  | "Retrieve Memory"
  | "Summarize"
  | "Decision Lookup"
  | "Project Lookup"
  | "Search"
  | "Explain"
  | "Compare"
  | "Unknown";

export interface IntentClassificationResult {
  intent: Intent;
  confidence: number;
  matchedRules: string[];
}

/**
 * Classify a user query into one of the designated intents deterministically.
 */
export async function classifyIntent(query: string): Promise<IntentClassificationResult> {
  const startTime = Date.now();
  const cleanQuery = query.trim().toLowerCase();

  let intent: Intent = "Unknown";
  let confidence = 0.5;
  const matchedRules: string[] = [];

  // Helper utility to match keywords/phrases
  const matchesAny = (phrases: string[]) =>
    phrases.some((phrase) => {
      if (phrase.startsWith("^")) {
        return cleanQuery.startsWith(phrase.slice(1));
      }
      if (phrase.endsWith("$")) {
        return cleanQuery.endsWith(phrase.slice(0, -1));
      }
      return cleanQuery.includes(phrase);
    });

  // Evaluate prompt rules loaded from prompts module
  if (matchesAny(rules.saveMemory)) {
    intent = "Save Memory";
    confidence = 0.95;
    matchedRules.push("starts_with_save_or_remember");
  } else if (matchesAny(rules.summarize)) {
    intent = "Summarize";
    confidence = 0.9;
    matchedRules.push("starts_with_summarize");
  } else if (matchesAny(rules.decisionLookup)) {
    intent = "Decision Lookup";
    confidence = 0.85;
    matchedRules.push("contains_decision_or_adr");
  } else if (matchesAny(rules.projectLookup)) {
    intent = "Project Lookup";
    confidence = 0.8;
    matchedRules.push("contains_project_or_workspace");
  } else if (matchesAny(rules.compare)) {
    intent = "Compare";
    confidence = 0.85;
    matchedRules.push("contains_compare_or_difference");
  } else if (matchesAny(rules.explain)) {
    intent = "Explain";
    confidence = 0.85;
    matchedRules.push("starts_with_explain_or_question");
  } else if (matchesAny(rules.search)) {
    intent = "Search";
    confidence = 0.9;
    matchedRules.push("starts_with_search_or_find");
  } else if (matchesAny(rules.retrieveMemory)) {
    intent = "Retrieve Memory";
    confidence = 0.9;
    matchedRules.push("starts_with_retrieve_or_recall");
  } else if (cleanQuery.endsWith("?") || cleanQuery.startsWith("who") || cleanQuery.startsWith("where") || cleanQuery.startsWith("why")) {
    intent = "Ask";
    confidence = 0.75;
    matchedRules.push("ends_with_question_mark_or_wh_words");
  }

  const latency = Date.now() - startTime;
  logger.info({
    msg: "Intent classification completed",
    query,
    intent,
    confidence,
    latencyMs: latency,
    matchedRules,
  });

  return { intent, confidence, matchedRules };
}

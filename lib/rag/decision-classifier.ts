export type DecisionType =
  | "ADR"
  | "Architecture Decision"
  | "Design Decision"
  | "Bug Fix"
  | "Performance Optimization"
  | "Security Decision"
  | "Refactoring"
  | "Unknown";

export interface ClassificationResult {
  decisionType: DecisionType;
  confidence: number;
  matchedRules: string[];
  extractedMetadata: Record<string, unknown>;
}

export interface IDecisionClassifier {
  classify(content: string): Promise<ClassificationResult>;
}

export class RuleBasedDecisionClassifier implements IDecisionClassifier {
  public async classify(content: string): Promise<ClassificationResult> {
    const lowercase = content.toLowerCase();

    const matchedRules: string[] = [];
    const extractedMetadata: Record<string, unknown> = {};

    let decisionType: DecisionType = "Unknown";
    let confidence = 0.5;

    // ------------------------------------------------------------------
    // 1. ADR Detection
    // ------------------------------------------------------------------

    const adrKeywords = [
      "adr",
      "adr-",
      "architecture decision record",
      "decision",
      "chosen",
      "choose",
      "selected",
      "accepted",
      "rejected",
      "trade-off",
      "tradeoff",
      "hnsw",
      "ivfflat",
      "pgvector",
      "vector search",
    ];

    const adrMatches = adrKeywords.filter((kw) =>
      lowercase.includes(kw)
    );

    const looksLikeAdr =
      /^adr[-\s]?\d*/i.test(content.trim()) ||
      lowercase.includes("architecture decision record");

    if (looksLikeAdr || adrMatches.length >= 2) {
      decisionType = "ADR";
      confidence = 0.95;

      matchedRules.push("ADR keywords detected");

      const titleMatch =
        content.match(/^#?\s*(ADR[-\s]?\d*:?.*)$/im) ??
        content.match(/^#\s+(.+)$/m);

      if (titleMatch) {
        extractedMetadata.title = titleMatch[1];
      }
    }

    // ------------------------------------------------------------------
    // 2. Security Decision
    // ------------------------------------------------------------------

    const securityKeywords = [
      "security",
      "encryption",
      "auth",
      "vulnerability",
      "cors",
      "csp",
      "sanitize",
      "jwt",
    ];

    const securityMatches = securityKeywords.filter((kw) =>
      lowercase.includes(kw)
    );

    if (securityMatches.length >= 2 && confidence < 0.9) {
      decisionType = "Security Decision";
      confidence = 0.85;

      matchedRules.push("Security pattern keywords matched");
    }

    // ------------------------------------------------------------------
    // 3. Performance
    // ------------------------------------------------------------------

    const perfKeywords = [
      "optimize",
      "optimization",
      "performance",
      "latency",
      "throughput",
      "benchmark",
      "cache",
      "caching",
      "memory footprint",
    ];

    const perfMatches = perfKeywords.filter((kw) =>
      lowercase.includes(kw)
    );

    if (perfMatches.length >= 2 && confidence < 0.9) {
      decisionType = "Performance Optimization";
      confidence = 0.85;

      matchedRules.push("Performance optimization keywords matched");
    }

    // ------------------------------------------------------------------
    // 4. Bug Fix
    // ------------------------------------------------------------------

    const bugKeywords = [
      "bug",
      "fix",
      "patch",
      "issue",
      "resolve",
      "resolved",
      "error",
      "crash",
      "hotfix",
    ];

    const bugMatches = bugKeywords.filter((kw) =>
      lowercase.includes(kw)
    );

    if (bugMatches.length >= 2 && confidence < 0.9) {
      decisionType = "Bug Fix";
      confidence = 0.8;

      matchedRules.push("Bug fix keywords matched");
    }

    // ------------------------------------------------------------------
    // 5. Refactoring
    // ------------------------------------------------------------------

    const refactorKeywords = [
      "refactor",
      "cleanup",
      "clean up",
      "simplification",
      "dry",
      "reorganize",
      "deprecate",
    ];

    const refactorMatches = refactorKeywords.filter((kw) =>
      lowercase.includes(kw)
    );

    if (refactorMatches.length >= 2 && confidence < 0.8) {
      decisionType = "Refactoring";
      confidence = 0.75;

      matchedRules.push("Refactoring keywords matched");
    }

    // ------------------------------------------------------------------
    // 6. Architecture Decision
    // ------------------------------------------------------------------

    const archKeywords = [
      "architecture",
      "architectural",
      "system design",
      "module",
      "modular",
      "hnsw",
      "ivfflat",
      "pgvector",
      "vector",
      "retrieval",
    ];

    const archMatches = archKeywords.filter((kw) =>
      lowercase.includes(kw)
    );

    if (archMatches.length >= 2 && confidence < 0.8) {
      decisionType = "Architecture Decision";
      confidence = 0.75;

      matchedRules.push("Architecture keywords matched");
    }

    // ------------------------------------------------------------------
    // 7. Design Decision
    // ------------------------------------------------------------------

    const designKeywords = [
      "design decision",
      "data model",
      "interface design",
      "component structure",
      "ux design",
    ];

    const designMatches = designKeywords.filter((kw) =>
      lowercase.includes(kw)
    );

    if (
      (designMatches.length >= 1 || lowercase.includes("design")) &&
      confidence < 0.7
    ) {
      decisionType = "Design Decision";
      confidence = 0.7;

      matchedRules.push("Design keywords matched");
    }

    return {
      decisionType,
      confidence,
      matchedRules,
      extractedMetadata,
    };
  }
}

export const decisionClassifier = new RuleBasedDecisionClassifier();

export async function classifyDecision(
  content: string
): Promise<ClassificationResult> {
  return decisionClassifier.classify(content);
}
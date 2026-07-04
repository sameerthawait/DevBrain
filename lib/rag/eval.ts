import goldDataset from "./gold-dataset.json";
import { hybridSearch, RetrievedChunk } from "./retrieve";
import { logger } from "../logger";

export interface EvaluationMetricsResult {
  precisionAt1: number;
  precisionAt3: number;
  precisionAt5: number;
  recallAt5: number;
  recallAt10: number;
  mrr: number;
  meanSimilarity: number;
  coverage: number;
}

/**
 * Calculates IR retrieval metrics: Precision, Recall, and MRR.
 */
export function calculateRetrievalMetrics(
  returnedChunks: RetrievedChunk[],
  expectedIds: string[]
): EvaluationMetricsResult {
  const returnedIds = returnedChunks.map((c) => c.id);

  // Helper to calculate Precision@k
  const precisionAtK = (k: number): number => {
    const subset = returnedIds.slice(0, k);
    const matches = subset.filter((id) => expectedIds.includes(id));
    return matches.length / k;
  };

  // Helper to calculate Recall@k
  const recallAtK = (k: number): number => {
    const subset = returnedIds.slice(0, k);
    const matches = subset.filter((id) => expectedIds.includes(id));
    return expectedIds.length > 0 ? matches.length / expectedIds.length : 0;
  };

  // Calculate Mean Reciprocal Rank (MRR)
  let reciprocalRank = 0;
  for (let i = 0; i < returnedIds.length; i++) {
    if (expectedIds.includes(returnedIds[i])) {
      reciprocalRank = 1 / (i + 1);
      break;
    }
  }

  // Calculate Mean Similarity
  const similarities = returnedChunks.map((c) => c.similarity);
  const meanSimilarity = similarities.length > 0
    ? similarities.reduce((a, b) => a + b, 0) / similarities.length
    : 0;

  // Coverage: whether at least one expected chunk was returned
  const coverage = returnedIds.some((id) => expectedIds.includes(id)) ? 1 : 0;

  return {
    precisionAt1: precisionAtK(1),
    precisionAt3: precisionAtK(3),
    precisionAt5: precisionAtK(5),
    recallAt5: recallAtK(5),
    recallAt10: recallAtK(10),
    mrr: reciprocalRank,
    meanSimilarity,
    coverage,
  };
}

/**
 * Execute automated evaluation over the entire Gold Dataset.
 */
export async function runRetrievalEvaluation(userId: string): Promise<EvaluationMetricsResult> {
  let totalP1 = 0;
  let totalP3 = 0;
  let totalP5 = 0;
  let totalR5 = 0;
  let totalR10 = 0;
  let totalMRR = 0;
  let totalSim = 0;
  let totalCoverage = 0;

  logger.info(`Starting retrieval evaluation over ${goldDataset.length} gold benchmark queries...`);

  for (const benchmark of goldDataset) {
    try {
      const results = await hybridSearch(userId, benchmark.query, { limit: 10 });
      const metrics = calculateRetrievalMetrics(results, benchmark.expectedChunkIds);

      totalP1 += metrics.precisionAt1;
      totalP3 += metrics.precisionAt3;
      totalP5 += metrics.precisionAt5;
      totalR5 += metrics.recallAt5;
      totalR10 += metrics.recallAt10;
      totalMRR += metrics.mrr;
      totalSim += metrics.meanSimilarity;
      totalCoverage += metrics.coverage;
    } catch (error: unknown) {
      logger.error({ msg: "Evaluation failed for benchmark query", query: benchmark.query, error: String(error) });
    }
  }

  const count = goldDataset.length;
  const summary: EvaluationMetricsResult = {
    precisionAt1: totalP1 / count,
    precisionAt3: totalP3 / count,
    precisionAt5: totalP5 / count,
    recallAt5: totalR5 / count,
    recallAt10: totalR10 / count,
    mrr: totalMRR / count,
    meanSimilarity: totalSim / count,
    coverage: totalCoverage / count,
  };

  logger.info({ msg: "Retrieval evaluation execution complete", metricsSummary: summary });

  return summary;
}
export { goldDataset };

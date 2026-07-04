import "dotenv/config";
import OpenAI from "openai";
import { env } from "../lib/config/env";

const modelsToTest = [
  "baai/bge-m3",
  "nvidia/embed-qa-4",
  "nvidia/llama-3.2-nemoretriever-1b-vlm-embed-v1",
  "nvidia/llama-3.2-nv-embedqa-1b-v1",
  "nvidia/llama-nemotron-embed-1b-v2",
  "nvidia/llama-nemotron-embed-vl-1b-v2",
  "nvidia/nemoretriever-parse",
  "nvidia/nemotron-parse",
  "nvidia/nv-embed-v1",
  "nvidia/nv-embedcode-7b-v1",
  "nvidia/nv-embedqa-e5-v5",
  "nvidia/nv-embedqa-mistral-7b-v2",
  "snowflake/arctic-embed-l"
];

async function find768() {
  const openai = new OpenAI({
    apiKey: env.NVIDIA_EMBEDDING_API_KEY,
    baseURL: env.NVIDIA_BASE_URL,
  });

  for (const model of modelsToTest) {
    try {
      const response = await openai.embeddings.create({
        model,
        input: ["Test sentence"],
        encoding_format: "float",
        input_type: "passage",
      } as any);
      const dim = response.data[0].embedding.length;
      console.log(`[SUCCESS] Model: ${model} -> Dimension: ${dim}`);
    } catch (err: any) {
      // If input_type is forbidden or not allowed, try without it
      if (err.message?.includes("extra_forbidden") || err.message?.includes("Extra inputs")) {
        try {
          const response = await openai.embeddings.create({
            model,
            input: ["Test sentence"],
            encoding_format: "float",
          });
          const dim = response.data[0].embedding.length;
          console.log(`[SUCCESS] Model: ${model} (no input_type) -> Dimension: ${dim}`);
          continue;
        } catch (innerErr: any) {
          console.log(`Model: ${model} (fallback) failed -> Status: ${innerErr.status}, Message: ${innerErr.message}`);
          continue;
        }
      }
      console.log(`Model: ${model} failed -> Status: ${err.status}, Message: ${err.message}`);
    }
  }
}

find768();

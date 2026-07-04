import "dotenv/config";
import OpenAI from "openai";
import { env } from "../lib/config/env";

const modelsToTest = [
  "nvidia/llama-nemotron-embed-1b-v2",
  "nvidia/nv-embedqa-e5-v5",
];

async function testDimensions() {
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
        input_type: "passage"
      } as any);
      const dim = response.data[0].embedding.length;
      console.log(`Model: ${model} -> Dimension: ${dim}`);
    } catch (err: any) {
      console.log(`Model: ${model} failed -> Status: ${err.status}, Message: ${err.message}`);
    }
  }
}

testDimensions();

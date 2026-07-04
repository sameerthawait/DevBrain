import "dotenv/config";
import OpenAI from "openai";
import { env } from "../lib/config/env";

async function testEmbedQA() {
  const openai = new OpenAI({
    apiKey: env.NVIDIA_EMBEDDING_API_KEY,
    baseURL: env.NVIDIA_BASE_URL,
  });

  const models = ["nvidia/embed-qa-4", "snowflake/arctic-embed-l"];

  for (const model of models) {
    try {
      const response = await openai.embeddings.create({
        model,
        input: ["Test sentence"],
        encoding_format: "float",
        input_type: "passage",
      } as any);
      console.log(`Success for ${model}! Dimension:`, response.data[0].embedding.length);
    } catch (err: any) {
      console.log(`Model ${model} failed -> Status: ${err.status}, Message: ${err.message}`);
    }
  }
}

testEmbedQA();

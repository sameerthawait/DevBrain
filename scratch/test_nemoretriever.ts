import "dotenv/config";
import OpenAI from "openai";
import { env } from "../lib/config/env";

async function testNemoretriever() {
  const openai = new OpenAI({
    apiKey: env.NVIDIA_EMBEDDING_API_KEY,
    baseURL: env.NVIDIA_BASE_URL,
  });

  try {
    const response = await openai.embeddings.create({
      model: "nvidia/llama-3.2-nemoretriever-1b-vlm-embed-v1",
      input: ["Test sentence"],
      encoding_format: "float",
      input_type: "passage",
    } as any);
    console.log("Success! Dimension:", response.data[0].embedding.length);
  } catch (err: any) {
    console.log(`Failed -> Status: ${err.status}, Message: ${err.message}`);
  }
}

testNemoretriever();

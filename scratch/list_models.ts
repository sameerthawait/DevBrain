import "dotenv/config";
import OpenAI from "openai";
import { env } from "../lib/config/env";

async function listModels() {
  const openai = new OpenAI({
    apiKey: env.NVIDIA_EMBEDDING_API_KEY,
    baseURL: env.NVIDIA_BASE_URL,
  });

  try {
    const list = await openai.models.list();
    console.log("Available models:");
    for (const model of list.data) {
      console.log(`- ${model.id}`);
    }
  } catch (err) {
    console.error("Failed to list models:", err);
  }
}

listModels();

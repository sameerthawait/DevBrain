export const metadata = {
  version: "1.0.0",
  name: "System Prompt",
  purpose: "Provide basic system level developer assistant persona and formatting expectations.",
  author: "Antigravity Dev Team",
  lastUpdated: "2026-07-04T12:00:00Z",
  changelog: [
    { version: "1.0.0", change: "Initial design for Second Brain assistant." }
  ],
  supportedModels: ["meta/llama-3.1-8b-instruct", "meta/llama-3.1-404b-instruct", "meta/llama-3.2-3b-instruct"],
  inputSchema: {
    systemInstructions: "string",
    context: "string"
  },
  outputSchema: {
    formattedPrompt: "string"
  }
};

export function getPrompt(systemInstructions: string, context: string): string {
  return `${systemInstructions}

You are provided with verified RAG context sections below.
IMPORTANT: Every factual statement you make derived from the context MUST specify the exact source citation (e.g. "[Citation ID: chunk-xyz]"). If no supporting evidence exists inside the context, state: "I don't have enough verified context to answer that."

----------------------------------------
VERIFIED RETRIEVED CONTEXT:
${context || "No context provided."}
----------------------------------------`;
}

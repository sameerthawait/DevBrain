export const metadata = {
  version: "1.0.0",
  name: "Intent Classification rules",
  purpose: "Guidelines for rule-based query intent router.",
  author: "Antigravity Dev Team",
  lastUpdated: "2026-07-04T12:00:00Z",
  changelog: [
    { version: "1.0.0", change: "Initial design for rule matching mapping." }
  ],
  supportedModels: ["deterministic-rules-v1"],
  inputSchema: {
    query: "string"
  },
  outputSchema: {
    intent: "string"
  }
};

export const rules = {
  saveMemory: ["^remember", "^save", "^store", "keep in mind"],
  summarize: ["^summarize", "^give a summary", "tldr"],
  decisionLookup: ["decision", "adr", "architecture decision"],
  projectLookup: ["project", "repo", "workspace"],
  search: ["^find", "^search", "^query"],
  explain: ["^explain", "what is", "how does"],
  compare: ["compare", "difference between", "vs"],
  retrieveMemory: ["^retrieve", "get memory", "recall"],
  ask: ["?$", "^who", "^where", "^why"]
};

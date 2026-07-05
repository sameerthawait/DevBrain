import { logger } from "../logger";

import { getPrompt, metadata as systemMetadata } from "../prompts/system/system-prompt-v1";

const PROMPT_VERSION = systemMetadata.version;

export interface PromptInput {
  systemPrompt: string;
  userPrompt: string;
  context: string;
  metadata?: Record<string, unknown>;
}

/**
 * Deterministically constructs standardized system and user prompt packages.
 */
export function buildAgentPrompts(input: PromptInput) {
  logger.info({
    msg: "Generating agent prompts package",
    promptVersion: PROMPT_VERSION,
    contextLength: input.context.length,
  });

  const formattedSystemPrompt = getPrompt(input.systemPrompt, input.context);
  const formattedUserPrompt = input.userPrompt;

  return {
    system: formattedSystemPrompt,
    user: formattedUserPrompt,
    version: PROMPT_VERSION,
  };
}

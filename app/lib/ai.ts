import { experimental_createProviderRegistry as createProviderRegistry } from "ai";

import type { SUPPORTED_PROVIDER_KEY } from "~/config/ai";

import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";

export const providerRegistry = createProviderRegistry({
  ...(process.env.AI_OPENAI_API_KEY
    ? {
        openai: createOpenAI({
          baseURL: process.env.AI_OPENAI_API_URL,
          apiKey: process.env.AI_OPENAI_API_KEY,
          organization: process.env.AI_OPENAI_ORGANIZATION,
          project: process.env.AI_OPENAI_PROJECT,
        }),
      }
    : {}),
  ...(process.env.AI_ANTHROPIC_API_KEY
    ? {
        anthropic: createAnthropic({
          baseURL: process.env.AI_ANTHROPIC_API_URL,
          apiKey: process.env.AI_ANTHROPIC_API_KEY,
        }),
      }
    : {}),
} satisfies Partial<Record<SUPPORTED_PROVIDER_KEY, unknown>>);

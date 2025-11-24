import { z } from "zod";

export const SUPPORTED_PROVIDER_KEYS = [
  "openai",
  "anthropic",
  "google",
  "fireworks",
] as const;
export type SUPPORTED_PROVIDER_KEY = (typeof SUPPORTED_PROVIDER_KEYS)[number];

export const roles = ["system", "user", "assistant"] as const;

const commonMessageSchema = z.object({
  id: z.string().optional(),
});

export const messageSchema = z.union([
  z
    .object({
      role: z.enum(roles),
      content: z.string(),
    })
    .merge(commonMessageSchema),
  z
    .object({
      role: z.enum(["user"]),
      content: z.union([
        z.string(),
        z.array(
          z.discriminatedUnion("type", [
            z.object({
              type: z.literal("text"),
              text: z.string(),
            }),
            z.object({
              type: z.literal("image"),
              image: z.string(),
              mimeType: z.string().optional(),
            }),
            z.object({
              type: z.literal("file"),
              data: z.string(),
              mimeType: z.string(),
            }),
          ]),
        ),
      ]),
    })
    .merge(commonMessageSchema),
]);

export type Message = z.infer<typeof messageSchema> & {
  metadata?: {
    usage?: {
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
    };
    responseTime?: number;
  };
};

export const defaultParams = {
  temperature: 0.7,
  max_tokens: 1024,
};

export type Conversation = {
  id: string;

  provider: SUPPORTED_PROVIDER_KEY;
  model: string;

  messages: Message[];

  createdAt: Date;

  isLoading: boolean;
};

export const defaultConversationConfig = {
  provider: "anthropic",
  model: "claude-3-5-sonnet-20241022",
} satisfies Pick<Conversation, "provider" | "model">;

export const modelSuggestions = {
  openai: [
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4.1-2025-04-14",
    "gpt-4.1-mini-2025-04-14",
    "gpt-4.1-nano-2025-04-14",
    "o4-mini-2025-04-16",
    "o3-mini",
    "o1",
  ],
  anthropic: [
    "claude-sonnet-4-5-20250929",
    "claude-sonnet-4-20250514",
    "claude-3-7-sonnet-20250219",
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
  ],
  google: [
    "gemini-2.5-pro-preview-05-06",
    "gemini-2.5-flash-preview-04-17",
    "gemini-2.0-flash-001",
    "gemini-2.0-flash-thinking-exp-01-21",
    "gemini-2.0-flash-lite-preview-02-05",
    "gemini-2.0-pro-exp-02-05",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
  ],
  fireworks: [
    "accounts/fireworks/models/deepseek-v3",
    "accounts/fireworks/models/deepseek-r1",
    "accounts/fireworks/models/llama-v3p1-405b-instruct",
  ],
} satisfies Record<SUPPORTED_PROVIDER_KEY, string[]>;

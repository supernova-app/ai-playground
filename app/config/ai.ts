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
              image: z.string().url(),
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

export type Message = z.infer<typeof messageSchema>;

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
    "gpt-4o-2024-05-13",
    "gpt-4o-2024-08-06",
    "gpt-4-turbo",
    "gpt-4o-mini",
    "gpt-4o-mini-2024-07-18",
    "gpt-4-turbo-2024-04-09",
    "gpt-4-turbo-preview",
    "gpt-4-0125-preview",
    "gpt-4-1106-preview",
    "gpt-4-vision-preview",
    "gpt-4",
    "gpt-4-0613",
    "gpt-4-32k",
    "gpt-4-32k-0613",
    "gpt-3.5-turbo-0125",
    "gpt-3.5-turbo",
    "gpt-3.5-turbo-1106",
    "gpt-3.5-turbo-16k",
    "gpt-3.5-turbo-0613",
    "gpt-3.5-turbo-16k-0613",
  ],
  anthropic: [
    "claude-3-5-sonnet-20241022",
    "claude-3-5-sonnet-20240620",
    "claude-3-opus-20240229",
    "claude-3-sonnet-20240229",
    "claude-3-5-haiku-20241022",
    "claude-3-haiku-20240307",
  ],
  google: ["gemini-2.0-flash-exp", "gemini-1.5-flash", "gemini-1.5-pro"],
  fireworks: [
    "accounts/fireworks/models/deepseek-v3",
    "accounts/fireworks/models/deepseek-r1",
    "accounts/fireworks/models/llama-v3p1-405b-instruct",
  ],
} satisfies Record<SUPPORTED_PROVIDER_KEY, string[]>;

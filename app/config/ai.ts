import { z } from "zod";

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
              mediaType: z.string().optional(),
            }),
            z.object({
              type: z.literal("file"),
              data: z.string(),
              mediaType: z.string(),
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

export const reasoningEfforts = ["off", "low", "medium", "high"] as const;
export type ReasoningEffort = (typeof reasoningEfforts)[number];

export type Conversation = {
  id: string;

  provider: string;
  model: string;
  reasoningEffort: ReasoningEffort;

  messages: Message[];

  createdAt: Date;

  isLoading: boolean;
};

export const defaultConversationConfig = {
  provider: "anthropic",
  model: "claude-sonnet-4-20250514",
} satisfies Pick<Conversation, "provider" | "model">;

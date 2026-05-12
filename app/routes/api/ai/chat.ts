import type { Route } from "./+types/chat";

import { defaultParams, reasoningEfforts, uiMessageSchema } from "~/config/ai";

import {
  streamText,
  wrapLanguageModel,
  convertToModelMessages,
  type UIMessage,
} from "ai";

import { z } from "zod";
import { logMiddleware, gateway } from "~/lib/ai";
import { auth } from "~/lib/auth.server";
import { isReasoningModel } from "~/lib/models";

export const maxDuration = 30;

const payloadSchema = z.object({
  provider: z.string(),
  model: z.string(),

  messages: z.array(uiMessageSchema),

  temperature: z.number().optional().default(defaultParams.temperature),
  max_tokens: z.number().int().optional().default(defaultParams.max_tokens),
  reasoningEffort: z.enum(reasoningEfforts).optional().default("off"),
});

const THINKING_EFFORT_TO_BUDGET: Record<string, number> = {
  low: 1024,
  medium: 8192,
  high: 24576,
};

function isGemini3Model(model: string) {
  return /^gemini-3/.test(model);
}

function getGoogleThinkingConfig(model: string, effort: string) {
  if (isGemini3Model(model)) {
    return { thinkingLevel: effort };
  }

  return { thinkingBudget: THINKING_EFFORT_TO_BUDGET[effort] ?? 8192 };
}

function getReasoningProviderOptions(
  provider: string,
  model: string,
  effort: string,
): Record<string, any> | undefined {
  if (effort === "off") {
    switch (provider) {
      case "google":
        return {
          google: { thinkingConfig: { thinkingBudget: 0 } },
        };
      case "anthropic":
        return {
          anthropic: { thinking: { type: "disabled" } },
        };
      default:
        return undefined;
    }
  }

  switch (provider) {
    case "openai":
      return {
        openai: { reasoningEffort: effort },
      };
    case "anthropic":
      return {
        anthropic: { thinking: { type: "adaptive" } },
      };
    case "google":
      return {
        google: { thinkingConfig: getGoogleThinkingConfig(model, effort) },
      };
    default:
      return undefined;
  }
}

export async function action({ request }: Route.ActionArgs) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return Response.json(
      { error: "Unauthorized" },
      {
        status: 401,
      },
    );
  }

  const jsonBody = await request.json();
  const payloadParseResult = payloadSchema.safeParse(jsonBody);

  if (!payloadParseResult.success) {
    console.error(
      "Payload Invalid",
      jsonBody,
      JSON.stringify(payloadParseResult.error),
    );

    return Response.json({ error: payloadParseResult.error }, { status: 400 });
  }

  const payload = payloadParseResult.data;

  // Gateway model ID format: provider/model
  const modelId = `${payload.provider}/${payload.model}`;

  const providerOptions = getReasoningProviderOptions(
    payload.provider,
    payload.model,
    payload.reasoningEffort,
  );

  try {
    const result = streamText({
      model: wrapLanguageModel({
        model: gateway(modelId),
        middleware: logMiddleware,
      }),

      messages: await convertToModelMessages(payload.messages as UIMessage[]),

      ...(!isReasoningModel(payload.provider, payload.model) &&
        payload.reasoningEffort === "off" && {
          temperature: payload.temperature,
        }),
      maxOutputTokens: payload.max_tokens,
      ...(providerOptions && { providerOptions }),
      headers: {
        "user-id": session.user.id,
      },
    });

    return result.toUIMessageStreamResponse({
      messageMetadata({ part }) {
        if (part.type === "finish") {
          return { usage: part.totalUsage };
        }
        return undefined;
      },
    });
  } catch (error: any) {
    console.error("AI API Error:", {
      provider: payload.provider,
      model: payload.model,
      modelId,
      providerOptions,
      messagesCount: payload.messages.length,
      messages: JSON.stringify(payload.messages, null, 2),
      errorName: error?.name,
      errorMessage: error?.message,
      errorCause: error?.cause,
      errorData: error?.data,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error), 2),
    });

    return Response.json(
      {
        error: error?.message || "Unknown error",
        details: error?.data || error?.cause,
      },
      { status: error?.status || 500 },
    );
  }
}

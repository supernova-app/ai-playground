import type { Route } from "./+types/chat";

import {
  defaultParams,
  messageSchema,
  SUPPORTED_PROVIDER_KEYS,
} from "~/config/ai";

import {
  streamText,
  experimental_wrapLanguageModel as wrapLanguageModel,
} from "ai";

import { z } from "zod";
import { logMiddleware, providerRegistry } from "~/lib/ai";
import { auth } from "~/lib/auth.server";

export const maxDuration = 30;

const payloadSchema = z.object({
  provider: z.enum(SUPPORTED_PROVIDER_KEYS),
  model: z.string(),

  messages: z.array(messageSchema),

  temperature: z.number().optional().default(defaultParams.temperature),
  max_tokens: z.number().int().optional().default(defaultParams.max_tokens),
});

function getProviderOptionsForAISDK(
  provider: string,
  model: string,
  maxTokens: number,
): Record<string, any> | undefined {
  const specificGoogleModels = [
    "gemini-2.5-flash-preview-04-17",
    "gemini-2.5-flash-preview-05-20",
    "gemini-2.5-pro-preview-06-05",
    "gemini-2.5-pro-preview-05-06",
    "gemini-2.5-flash",
    "gemini-2.5-pro",
  ];

  if (provider === "google" && specificGoogleModels.includes(model)) {
    return {
      google: {
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    };
  }

  // GPT-5.2 models require max_completion_tokens instead of max_tokens
  if (provider === "openai" && model.startsWith("gpt-5.2")) {
    return {
      openai: {
        maxCompletionTokens: maxTokens,
      },
    };
  }

  return undefined;
}

function shouldOmitMaxTokens(provider: string, model: string): boolean {
  // GPT-5.2 models don't support max_tokens, use max_completion_tokens via providerOptions instead
  return provider === "openai" && model.startsWith("gpt-5.2");
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

  // modelId is used by the registry to get the right model
  // syntax is provider:model
  // eg. openai:gpt-4o
  const modelId = `${payload.provider}:${payload.model}`;

  const providerOptions = getProviderOptionsForAISDK(
    payload.provider,
    payload.model,
    payload.max_tokens,
  );

  const omitMaxTokens = shouldOmitMaxTokens(payload.provider, payload.model);

  try {
    const result = streamText({
      model: wrapLanguageModel({
        model: providerRegistry.languageModel(modelId),
        middleware: logMiddleware,
      }),

      messages: payload.messages,

      temperature: payload.temperature,
      ...(!omitMaxTokens && { maxTokens: payload.max_tokens }),
      ...(providerOptions && { providerOptions }),
      headers: {
        "user-id": session.user.id,
      },
    });

    return result.toDataStreamResponse();
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

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

export async function action({ request }: Route.ActionArgs) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return Response.json(
      { error: "Unauthorized" },
      {
        status: 401,
      }
    );
  }

  const jsonBody = await request.json();
  const payloadParseResult = payloadSchema.safeParse(jsonBody);

  if (!payloadParseResult.success) {
    console.error(
      "Payload Invalid",
      jsonBody,
      JSON.stringify(payloadParseResult.error)
    );

    return Response.json({ error: payloadParseResult.error }, { status: 400 });
  }

  const payload = payloadParseResult.data;

  // modelId is used by the registry to get the right model
  // syntax is provider:model
  // eg. openai:gpt-4o
  const modelId = `${payload.provider}:${payload.model}`;

  const result = streamText({
    model: wrapLanguageModel({
      model: providerRegistry.languageModel(modelId),
      middleware: logMiddleware,
    }),

    messages: payload.messages,

    temperature: payload.temperature,
    maxTokens: payload.max_tokens,

    headers: {
      "user-id": session.user.id,
    },
  });

  return result.toDataStreamResponse();
}

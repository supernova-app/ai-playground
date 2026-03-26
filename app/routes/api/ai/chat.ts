import type { Route } from "./+types/chat";

import { defaultParams, messageSchema, reasoningEfforts } from "~/config/ai";

import { streamText, wrapLanguageModel } from "ai";

import { z } from "zod";
import { logMiddleware, gateway } from "~/lib/ai";
import { auth } from "~/lib/auth.server";

export const maxDuration = 30;

const payloadSchema = z.object({
  provider: z.string(),
  model: z.string(),

  messages: z.array(messageSchema),

  temperature: z.number().optional().default(defaultParams.temperature),
  max_tokens: z.number().int().optional().default(defaultParams.max_tokens),
  reasoningEffort: z.enum(reasoningEfforts).optional().default("off"),
});

function getReasoningProviderOptions(
  provider: string,
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
        google: { thinkingConfig: { thinkingLevel: effort } },
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
    payload.reasoningEffort,
  );

  try {
    const result = streamText({
      model: wrapLanguageModel({
        model: gateway(modelId),
        middleware: logMiddleware,
      }),

      messages: payload.messages,

      temperature: payload.temperature,
      maxOutputTokens: payload.max_tokens,
      ...(providerOptions && { providerOptions }),
      headers: {
        "user-id": session.user.id,
      },
    });

    // Stream text and append usage metadata at the end
    const textStream = result.textStream;
    const usagePromise = result.usage;
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of textStream) {
          controller.enqueue(encoder.encode(chunk));
        }
        // Append usage metadata after stream completes
        const usage = await usagePromise;
        controller.enqueue(
          encoder.encode(`\n__META__${JSON.stringify({ usage })}`),
        );
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
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

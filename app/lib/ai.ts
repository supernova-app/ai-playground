import { type LanguageModelMiddleware } from "ai";

import { createGateway } from "@ai-sdk/gateway";

import { db, schema } from "./db";
import type { NewLog } from "./db/schema";

export const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN,
});

// Logging is best-effort: a failed insert must not fail the user's request,
// and in a stream it would error the response after the reply was sent.
async function saveLog(
  userId: string,
  request: NewLog["request"],
  response: NewLog["response"],
) {
  try {
    await db.insert(schema.llmLog).values([
      {
        userId,
        request,
        response,
      },
    ]);
  } catch (error: any) {
    console.error("Failed to save LLM log:", error?.message);
  }
}

export const logMiddleware: LanguageModelMiddleware = {
  specificationVersion: "v3",

  wrapGenerate: async ({ model, params, doGenerate }) => {
    const logRequest = {
      provider: model.provider,
      model: model.modelId,
      params,
    };

    const result = await doGenerate();

    const text = result.content
      .filter((part: any) => part.type === "text")
      .map((part: any) => part.text)
      .join("");

    const logResponse = {
      text,
      meta: {
        finishReason: result.finishReason,
        usage: result.usage,
        providerMetadata: result.providerMetadata,
      },
    };

    await saveLog(params.headers!["user-id"]!, logRequest, logResponse);

    return result;
  },

  wrapStream: async ({ model, params, doStream }) => {
    const logRequest = {
      provider: model.provider,
      model: model.modelId,
      params,
    };

    const { stream, ...rest } = await doStream();

    const logResponse = {
      text: "",
      meta: null as any,
    };

    const transformStream = new TransformStream({
      transform(chunk: any, controller: any) {
        if (chunk.type === "text-delta") {
          logResponse.text += chunk.delta;
        }

        if (chunk.type === "finish") {
          logResponse.meta = chunk;
        }

        controller.enqueue(chunk);
      },

      async flush() {
        await saveLog(params.headers!["user-id"]!, logRequest, logResponse);
      },
    });

    return {
      stream: stream.pipeThrough(transformStream),
      ...rest,
    };
  },
};

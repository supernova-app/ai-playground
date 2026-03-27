import { type LanguageModelMiddleware } from "ai";

import { createGateway } from "@ai-sdk/gateway";

import { db, schema } from "./db";

export const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN,
});

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

    await db.insert(schema.llmLog).values([
      {
        userId: params.headers!["user-id"]!,
        request: logRequest,
        response: logResponse,
      },
    ]);

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
        await db.insert(schema.llmLog).values([
          {
            userId: params.headers!["user-id"]!,
            request: logRequest,
            response: logResponse,
          },
        ]);
      },
    });

    return {
      stream: stream.pipeThrough(transformStream),
      ...rest,
    };
  },
};

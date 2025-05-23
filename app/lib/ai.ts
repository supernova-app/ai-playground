import {
  experimental_createProviderRegistry as createProviderRegistry,
  type Experimental_LanguageModelV1Middleware as LanguageModelV1Middleware,
  type LanguageModelV1StreamPart,
  type Provider,
} from "ai";

import type { SUPPORTED_PROVIDER_KEY } from "~/config/ai";

import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
// import { createAzure } from "@ai-sdk/azure";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
// import { createVertex } from "@ai-sdk/google-vertex";
import { createFireworks } from "@ai-sdk/fireworks";

import { db, schema } from "./db";

let config: Partial<Record<SUPPORTED_PROVIDER_KEY, Provider>> = {};

if (process.env.AI_OPENAI_API_KEY) {
  config.openai = createOpenAI({
    baseURL: process.env.AI_OPENAI_API_URL,
    apiKey: process.env.AI_OPENAI_API_KEY,
    organization: process.env.AI_OPENAI_ORGANIZATION,
    project: process.env.AI_OPENAI_PROJECT,
    compatibility: "strict",
  });
}

if (process.env.AI_ANTHROPIC_API_KEY) {
  config.anthropic = createAnthropic({
    baseURL: process.env.AI_ANTHROPIC_API_URL,
    apiKey: process.env.AI_ANTHROPIC_API_KEY,
  });
}

// if (process.env.AI_AZURE_API_KEY) {
//   config.azure = createAzure({
//     resourceName: process.env.AI_AZURE_RESOURCE_NAME,
//     apiKey: process.env.AI_AZURE_API_KEY,
//     apiVersion: process.env.AI_AZURE_API_VERSION,
//     baseURL: process.env.AI_AZURE_API_URL,
//   });
// }

if (process.env.AI_GOOGLE_GENERATIVE_AI_API_KEY) {
  config.google = createGoogleGenerativeAI({
    baseURL: process.env.AI_GOOGLE_GENERATIVE_AI_API_URL,
    apiKey: process.env.AI_GOOGLE_GENERATIVE_AI_API_KEY,
  });
}

// if (
//   process.env.AI_VERTEX_GOOGLE_PROJECT &&
//   process.env.AI_VERTEX_GOOGLE_CLIENT_EMAIL &&
//   process.env.AI_VERTEX_GOOGLE_PRIVATE_KEY
// ) {
//   config.vertex = createVertex({
//     project: process.env.AI_VERTEX_GOOGLE_PROJECT,
//     location: process.env.AI_VERTEX_GOOGLE_LOCATION,
//     baseURL: process.env.AI_VERTEX_GOOGLE_API_URL,
//     googleAuthOptions: {
//       credentials: {
//         client_email: process.env.AI_VERTEX_GOOGLE_CLIENT_EMAIL,
//         private_key: process.env.AI_VERTEX_GOOGLE_PRIVATE_KEY,
//       },
//     },
//   });
// }

if (process.env.AI_FIREWORKS_API_KEY) {
  const fireworks = createFireworks({
    baseURL: process.env.AI_FIREWORKS_API_URL,
    apiKey: process.env.AI_FIREWORKS_API_KEY,
  });

  config.fireworks = {
    languageModel(modelId) {
      return fireworks.chatModel(modelId);
    },
    textEmbeddingModel(modelId) {
      return fireworks.textEmbeddingModel(modelId);
    },
  };
}

export const providerRegistry = createProviderRegistry(config);

export const logMiddleware: LanguageModelV1Middleware = {
  wrapGenerate: async ({ model, params, doGenerate }) => {
    const logRequest = {
      provider: model.provider,
      model: model.modelId,
      params,
    };

    const result = await doGenerate();

    const logResponse = {
      text: result.text!,
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

    const transformStream = new TransformStream<
      LanguageModelV1StreamPart,
      LanguageModelV1StreamPart
    >({
      transform(chunk, controller) {
        if (chunk.type === "text-delta") {
          logResponse.text += chunk.textDelta;
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

export type ModelInfo = {
  name: string;
  tags: string[];
  released?: number;
};

export type ModelsData = Record<string, ModelInfo[]>;

const GATEWAY_MODELS_URL = "https://ai-gateway.vercel.sh/v1/models";

let cachedModels: ModelsData | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function fetchAndCacheModels() {
  const response = await fetch(GATEWAY_MODELS_URL, {
    headers: {
      Authorization: `Bearer ${process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Gateway returned ${response.status}`);
  }

  const data = await response.json();

  const grouped: ModelsData = {};

  for (const model of data.data ?? []) {
    const id: string = model.id;
    const slashIndex = id.indexOf("/");

    if (slashIndex === -1) continue;

    if (model.type && model.type !== "language") continue;

    const provider = id.substring(0, slashIndex);
    const modelName = id.substring(slashIndex + 1);

    if (!grouped[provider]) {
      grouped[provider] = [];
    }
    grouped[provider].push({
      name: modelName,
      tags: model.tags ?? [],
      ...(typeof model.released === "number" && { released: model.released }),
    });
  }

  // Sort providers and models alphabetically
  const sorted: ModelsData = {};
  for (const provider of Object.keys(grouped).sort()) {
    sorted[provider] = grouped[provider].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  cachedModels = sorted;
  cacheTimestamp = Date.now();

  return sorted;
}

export async function getModels() {
  const now = Date.now();

  if (cachedModels && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedModels;
  }

  try {
    return await fetchAndCacheModels();
  } catch (error) {
    if (cachedModels) return cachedModels;
    throw error;
  }
}

export function getCachedModels() {
  return cachedModels;
}

export function isReasoningModel(provider: string, model: string) {
  const providerModels = cachedModels?.[provider];
  if (!providerModels) return false;
  const entry = providerModels.find((m) => m.name === model);
  return entry?.tags.includes("reasoning") ?? false;
}

// Preload cache at server startup
fetchAndCacheModels().catch((err) =>
  console.error("Failed to preload models:", err?.message),
);

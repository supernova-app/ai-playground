let cachedModels: Record<string, string[]> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function fetchAndCacheModels() {
  const response = await fetch(
    "https://ai-gateway.vercel.sh/v1/models",
    {
      headers: {
        Authorization: `Bearer ${process.env.AI_GATEWAY_API_KEY!}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Gateway returned ${response.status}`);
  }

  const data = await response.json();

  // Group models by provider
  // Model IDs from the gateway are in "provider/model" format
  const grouped: Record<string, string[]> = {};

  for (const model of data.data ?? []) {
    const id: string = model.id;
    const slashIndex = id.indexOf("/");

    if (slashIndex === -1) continue;

    const provider = id.substring(0, slashIndex);
    const modelName = id.substring(slashIndex + 1);

    if (!grouped[provider]) {
      grouped[provider] = [];
    }
    grouped[provider].push(modelName);
  }

  // Sort providers and models alphabetically
  const sorted: Record<string, string[]> = {};
  for (const provider of Object.keys(grouped).sort()) {
    sorted[provider] = grouped[provider].sort();
  }

  cachedModels = sorted;
  cacheTimestamp = Date.now();

  return sorted;
}

// Preload cache at server startup
fetchAndCacheModels().catch((err) =>
  console.error("Failed to preload models:", err?.message),
);

export async function loader() {
  const now = Date.now();

  if (cachedModels && now - cacheTimestamp < CACHE_TTL_MS) {
    return Response.json(cachedModels);
  }

  try {
    const models = await fetchAndCacheModels();
    return Response.json(models);
  } catch (error: any) {
    console.error("Failed to fetch models from gateway:", error?.message);

    // Return cached data if available, even if stale
    if (cachedModels) {
      return Response.json(cachedModels);
    }

    return Response.json(
      { error: "Failed to fetch models" },
      { status: 502 },
    );
  }
}

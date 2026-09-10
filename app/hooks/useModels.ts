import { useEffect, useState } from "react";

import type { ModelInfo, ModelsData } from "~/lib/models";

export type { ModelInfo, ModelsData };

let cachedData: ModelsData | null = null;
let fetchPromise: Promise<ModelsData> | null = null;

const subscribers = new Set<(data: ModelsData) => void>();

async function fetchModels() {
  const response = await fetch("/api/ai/models");
  if (!response.ok) {
    throw new Error("Failed to fetch models");
  }
  return response.json();
}

function loadModels() {
  if (!fetchPromise) {
    fetchPromise = fetchModels()
      .then((data) => {
        cachedData = data;
        subscribers.forEach((notify) => notify(data));
        return data;
      })
      .finally(() => {
        fetchPromise = null;
      });
  }

  return fetchPromise;
}

export function useModels() {
  const [models, setModels] = useState<ModelsData>(cachedData ?? {});
  const [isLoading, setIsLoading] = useState(!cachedData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedData) {
      setModels(cachedData);
      setIsLoading(false);
      return;
    }

    subscribers.add(setModels);

    let active = true;

    loadModels()
      .then(() => {
        if (active) setError(null);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
      subscribers.delete(setModels);
    };
  }, []);

  const providers = Object.keys(models).sort();

  function getModelNames(provider: string) {
    return (models[provider] ?? []).map((m) => m.name);
  }

  function isReasoningModel(provider: string, model: string) {
    const entry = models[provider]?.find((m) => m.name === model);
    return entry?.tags.includes("reasoning") ?? false;
  }

  function getLatestModelName(provider: string) {
    const entries = models[provider] ?? [];
    if (entries.length === 0) return undefined;

    return entries.reduce((latest, entry) =>
      (entry.released ?? 0) > (latest.released ?? 0) ? entry : latest,
    ).name;
  }

  return {
    models,
    providers,
    isLoading,
    error,
    getModelNames,
    getLatestModelName,
    isReasoningModel,
  };
}

import { useEffect, useState } from "react";

type ModelInfo = {
  name: string;
  tags: string[];
};

type ModelsData = Record<string, ModelInfo[]>;

let cachedData: ModelsData | null = null;
let fetchPromise: Promise<ModelsData> | null = null;

async function fetchModels() {
  const response = await fetch("/api/ai/models");
  if (!response.ok) {
    throw new Error("Failed to fetch models");
  }
  return response.json();
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

    if (!fetchPromise) {
      fetchPromise = fetchModels();
    }

    fetchPromise
      .then((data) => {
        cachedData = data;
        setModels(data);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setIsLoading(false);
        fetchPromise = null;
      });
  }, []);

  const providers = Object.keys(models).sort();

  function getModelNames(provider: string) {
    return (models[provider] ?? []).map((m) => m.name);
  }

  function isReasoningModel(provider: string, model: string) {
    const entry = models[provider]?.find((m) => m.name === model);
    return entry?.tags.includes("reasoning") ?? false;
  }

  return { models, providers, isLoading, error, getModelNames, isReasoningModel };
}

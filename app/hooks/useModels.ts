import { useEffect, useState } from "react";

type ModelsData = Record<string, string[]>;

let cachedData: ModelsData | null = null;
let fetchPromise: Promise<ModelsData> | null = null;

async function fetchModels(): Promise<ModelsData> {
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

  return { models, providers, isLoading, error };
}

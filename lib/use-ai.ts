"use client";

import { useCallback, useState } from "react";
import { ApiRequestError, readJson } from "./http";

export type AiError = { code: string; message: string };

export function useAiRequest<T>() {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AiError | null>(null);

  const run = useCallback(async (body: unknown) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await readJson<T>(response, "The assistant could not answer.");
      setData(payload);
      return payload;
    } catch (cause) {
      const failure =
        cause instanceof ApiRequestError
          ? { code: cause.code, message: cause.message }
          : { code: "network", message: "Network error. Check your connection and try again." };
      setError(failure);
      setData(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { data, loading, error, run, reset };
}

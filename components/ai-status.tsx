"use client";

import type { AiError } from "@/lib/use-ai";
import { AlertIcon, SparkIcon } from "./icons";
import { Skeleton } from "./ui";

const COPY: Record<string, { title: string; body: string; retryable: boolean }> = {
  missing_key: {
    title: "Live AI is not configured",
    body: "This deployment has no GEMINI_API_KEY set, so no AI answer is generated. Everything else on the page is real data. Add the key to the environment and redeploy to enable the assistant.",
    retryable: false,
  },
  busy: {
    title: "Gemini is busy",
    body: "The model returned a temporary capacity error (503) and the fallback model did too. Nothing is wrong with your setup — try again in a minute.",
    retryable: true,
  },
  rate_limited: {
    title: "Too many requests",
    body: "This browser has hit the per-minute limit for AI requests. Wait about a minute, then try again.",
    retryable: true,
  },
  timeout: {
    title: "The model timed out",
    body: "Gemini took longer than 25 seconds to answer, so the request was cancelled rather than left hanging. Try a shorter question.",
    retryable: true,
  },
  bad_output: {
    title: "Unusable AI answer",
    body: "The model replied but the answer did not match the expected structure, so it was discarded instead of being shown half-formed. Try again.",
    retryable: true,
  },
  upstream: {
    title: "AI unavailable",
    body: "The model provider returned an error. No answer was invented as a substitute.",
    retryable: true,
  },
  invalid_request: {
    title: "The model rejected the request",
    body: "Gemini refused this request outright, so retrying the same text will fail the same way. Try rewording it.",
    retryable: false,
  },
  model_unavailable: {
    title: "Configured model unavailable",
    body: "The model named in GEMINI_MODEL is not available for this API key, and the fallback model failed too. Check the model name against the Gemini model list.",
    retryable: false,
  },
  network: {
    title: "Network error",
    body: "The request never reached the server. Check your connection and try again.",
    retryable: true,
  },
  unknown: {
    title: "The assistant failed",
    body: "Something went wrong while generating this answer. You can retry.",
    retryable: true,
  },
};

export function AiErrorPanel({ error, onRetry }: { error: AiError; onRetry?: () => void }) {
  const copy = COPY[error.code] ?? COPY.unknown;
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4" role="alert">
      <div className="flex items-start gap-2.5">
        <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        <div>
          <p className="text-sm font-medium text-amber-900">{copy.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-amber-900">{copy.body}</p>
          {error.code === "missing_key" ? null : (
            <p className="mt-1 text-xs text-amber-800">Server said: {error.message}</p>
          )}
          {copy.retryable && onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
            >
              Try again
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function AiThinking({ label = "Thinking with the current readings" }: { label?: string }) {
  return (
    <div className="space-y-2" aria-live="polite">
      <p className="flex items-center gap-2 text-sm text-ink-muted">
        <SparkIcon className="h-4 w-4 animate-pulse" />
        {label}…
      </p>
      <Skeleton className="h-3.5 w-11/12" />
      <Skeleton className="h-3.5 w-10/12" />
      <Skeleton className="h-3.5 w-8/12" />
    </div>
  );
}

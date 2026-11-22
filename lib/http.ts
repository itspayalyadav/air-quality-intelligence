export type ApiErrorBody = { error: { code: string; message: string } };

export function apiError(status: number, code: string, message: string, headers?: HeadersInit) {
  const body: ApiErrorBody = { error: { code, message } };
  return Response.json(body, { status, headers });
}

export class ApiRequestError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

/**
 * Reads a JSON API response and turns the shared `{ error: { code, message } }`
 * envelope into one typed error. Parse failures stay generic so callers can
 * report them the same way they report a network failure.
 */
export async function readJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error("The server returned an unreadable response.");
  }

  if (!response.ok) {
    const failure = (body as Partial<ApiErrorBody> | null)?.error;
    throw new ApiRequestError(failure?.code ?? "unknown", failure?.message || fallbackMessage);
  }
  return body as T;
}

/** Numeric query parameter that keeps "missing" distinct from 0. */
export function numberParam(params: URLSearchParams, key: string): number | null {
  const raw = params.get(key);
  if (raw == null || raw.trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

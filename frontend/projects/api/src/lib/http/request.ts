import { ApiError } from '../errors/api-error';

/**
 * Reads JSON from the backend with the browser's own `fetch` (docs/adr/0005), cancelled when
 * `signal` aborts. A refusal becomes an `ApiError` with the ProblemDetails' `code`; no answer
 * becomes `unreachable`. An abort rejects with the signal's reason.
 */
export function getJson<T>(url: string, signal: AbortSignal): Promise<T> {
  return send<T>(url, { signal, headers: { accept: 'application/json' } });
}

/** Posts `body` as JSON and reads JSON back, as `getJson` does. What is posted is never in the address. */
export function postJson<T>(url: string, body: unknown, signal: AbortSignal): Promise<T> {
  return send<T>(url, {
    signal,
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function send<T>(url: string, init: RequestInit & { signal: AbortSignal }): Promise<T> {
  const { signal } = init;
  let response: Response;
  try {
    response = await fetch(url, { ...init, credentials: 'same-origin' });
  } catch (error) {
    if (signal.aborted) throw signal.reason;
    throw new ApiError(ApiError.unreachable, 0, { cause: error });
  }
  if (!response.ok) {
    const retryAfter = Number(response.headers.get('retry-after'));
    throw new ApiError(await codeOf(response), response.status, {
      retryAfterSeconds: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
    });
  }
  return (await response.json()) as T;
}

/** The `code` of a ProblemDetails, or `unexpected` when the answer carries none. */
async function codeOf(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    const code =
      typeof body === 'object' && body !== null ? (body as { code?: unknown }).code : null;
    return typeof code === 'string' ? code : 'unexpected';
  } catch {
    return 'unexpected';
  }
}

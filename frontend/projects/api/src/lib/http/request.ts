import { ApiError } from '../errors/api-error';

/**
 * Reads JSON from the backend with the browser's own `fetch` (docs/adr/0005), cancelled when
 * `signal` aborts. A refusal becomes an `ApiError` with the ProblemDetails' `code`; no answer
 * becomes `unreachable`. An abort rejects with the signal's reason.
 */
export async function getJson<T>(url: string, signal: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      signal,
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
    });
  } catch (error) {
    if (signal.aborted) throw signal.reason;
    throw new ApiError(ApiError.unreachable, 0, { cause: error });
  }
  if (!response.ok) throw new ApiError(await codeOf(response), response.status);
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

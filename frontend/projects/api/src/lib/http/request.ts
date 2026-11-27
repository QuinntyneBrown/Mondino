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

/** Puts `body` as JSON and reads JSON back, as `postJson` does. */
export function putJson<T>(url: string, body: unknown, signal: AbortSignal): Promise<T> {
  return send<T>(url, {
    signal,
    method: 'PUT',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** Posts `body` as JSON to an endpoint that answers with no body, as `postJson` does. */
export async function post(url: string, body: unknown, signal: AbortSignal): Promise<void> {
  await send<null>(
    url,
    {
      signal,
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify(body),
    },
    false,
  );
}

/** Deletes what `url` names; the endpoint answers with no body. Sends the antiforgery token, as every change does. */
export async function remove(url: string, signal: AbortSignal): Promise<void> {
  await send<null>(
    url,
    { signal, method: 'DELETE', headers: { accept: 'application/json' } },
    false,
  );
}

/** The cookie the backend gives a session's antiforgery token in, and the header it is returned in (docs/adr/0010). */
const antiforgeryCookie = '__Host-mondino-xsrf';
const antiforgeryHeader = 'x-xsrf-token';

async function send<T>(
  url: string,
  init: RequestInit & { signal: AbortSignal },
  readsBody = true,
): Promise<T> {
  const { signal } = init;
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: withAntiforgery(init),
      credentials: 'same-origin',
    });
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
  return readsBody ? ((await response.json()) as T) : (null as T);
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

/**
 * A change (any method but GET and HEAD) returns the antiforgery token the backend gave the
 * session, so another site cannot make one with the teammate's cookie. A read sends none.
 */
function withAntiforgery(init: RequestInit): HeadersInit | undefined {
  const method = (init.method ?? 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD') return init.headers;
  const token = cookie(antiforgeryCookie);
  if (!token) return init.headers;
  const headers = new Headers(init.headers);
  headers.set(antiforgeryHeader, token);
  return headers;
}

/** The value of one cookie scripts may read, or null. */
function cookie(name: string): string | null {
  for (const part of document.cookie.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return null;
}

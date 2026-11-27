/**
 * A refusal from the backend, or no answer at all. A screen branches on `code` and shows its own
 * words; the backend's text is never shown.
 */
export class ApiError extends Error {
  /** The code of a request that got no answer: the backend or the network is down. */
  static readonly unreachable = 'unreachable';

  constructor(
    readonly code: string,
    readonly status: number,
    options?: ErrorOptions,
  ) {
    super(code, options);
    this.name = 'ApiError';
  }
}

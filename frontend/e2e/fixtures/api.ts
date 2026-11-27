import type { Page, Route } from '@playwright/test';

export interface Answer {
  status?: number;
  json?: unknown;
  headers?: Record<string, string>;
}

/**
 * Answers the app's requests to the backend from fixtures. No spec reaches a real backend:
 * a request to /api that no fixture answers is recorded as a problem and fails the spec.
 */
export class ApiFixture {
  private readonly answers = new Map<string, Answer | ((route: Route) => Answer)>();

  constructor(private readonly problems: string[]) {}

  /** Answer `method path` (for example "GET /api/teams/t1/pins") from now on. */
  answer(method: string, path: string, answer: Answer | ((route: Route) => Answer)): void {
    this.answers.set(`${method.toUpperCase()} ${path}`, answer);
  }

  /** Refuse `method path` with ProblemDetails carrying a `code`. */
  refuse(method: string, path: string, status: number, code: string): void {
    this.answer(method, path, {
      status,
      headers: { 'content-type': 'application/problem+json' },
      json: { type: 'about:blank', title: code, status, code },
    });
  }

  async install(page: Page): Promise<void> {
    await page.route('**/api/**', async (route) => {
      const request = route.request();
      const key = `${request.method()} ${new URL(request.url()).pathname}`;
      const found = this.answers.get(key);
      if (!found) {
        this.problems.push(`Unanswered API request: ${key}`);
        await route.abort('failed');
        return;
      }
      const answer = typeof found === 'function' ? found(route) : found;
      await route.fulfill({
        status: answer.status ?? 200,
        headers: { 'content-type': 'application/json', ...answer.headers },
        body: answer.json === undefined ? '' : JSON.stringify(answer.json),
      });
    });
  }
}

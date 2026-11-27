import type { Page } from '@playwright/test';

/** What a page holds that the globe could leave behind. */
export interface Held {
  /** WebGL contexts made, and how many of them are still alive. */
  readonly contexts: number;
  readonly liveContexts: number;
  /** Draw calls made on any WebGL context so far. */
  readonly draws: number;
  /** Resize observers still observing something. */
  readonly observing: number;
  /** `visibilitychange` listeners on the document. */
  readonly visibilityListeners: number;
  /** `change` listeners on colour scheme queries. */
  readonly schemeListeners: number;
}

/**
 * Records, from before the app starts, every WebGL context made, every draw call, every resize
 * observer and every media query listened to, so a spec can see what is left after a screen goes.
 */
export async function watchWhatIsHeld(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const record = {
      contexts: [] as WebGL2RenderingContext[],
      draws: 0,
      observers: new Set<ResizeObserver>(),
      queries: [] as MediaQueryList[],
    };
    Object.assign(window, { __held: record });

    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      ...args: unknown[]
    ) {
      const context = (getContext as (...a: unknown[]) => unknown).apply(this, args);
      if (context instanceof WebGL2RenderingContext && !record.contexts.includes(context))
        record.contexts.push(context);
      return context;
    } as typeof getContext;

    for (const name of ['drawElements', 'drawArrays'] as const) {
      const draw = WebGL2RenderingContext.prototype[name] as (...a: unknown[]) => void;
      Object.defineProperty(WebGL2RenderingContext.prototype, name, {
        value(this: WebGL2RenderingContext, ...args: unknown[]) {
          record.draws++;
          return draw.apply(this, args);
        },
      });
    }

    const { observe, disconnect } = ResizeObserver.prototype;
    ResizeObserver.prototype.observe = function (this: ResizeObserver, ...args) {
      record.observers.add(this);
      return observe.apply(this, args);
    };
    ResizeObserver.prototype.disconnect = function (this: ResizeObserver) {
      record.observers.delete(this);
      return disconnect.apply(this);
    };

    const matchMedia = window.matchMedia;
    window.matchMedia = function (query: string) {
      const list = matchMedia.call(window, query);
      if (query.includes('prefers-color-scheme')) record.queries.push(list);
      return list;
    };
  });
}

/** What the page holds now. */
export async function whatIsHeld(page: Page): Promise<Held> {
  const cdp = await page.context().newCDPSession(page);
  const listenersOn = async (expression: string, type: string) => {
    const { result } = await cdp.send('Runtime.evaluate', { expression });
    if (!result.objectId) return 0;
    const { listeners } = await cdp.send('DOMDebugger.getEventListeners', {
      objectId: result.objectId,
    });
    return listeners.filter((listener) => listener.type === type).length;
  };
  const queries = await page.evaluate(
    () => (window as unknown as { __held: { queries: unknown[] } }).__held.queries.length,
  );
  let schemeListeners = 0;
  for (let i = 0; i < queries; i++)
    schemeListeners += await listenersOn(`window.__held.queries[${i}]`, 'change');
  const visibilityListeners = await listenersOn('document', 'visibilitychange');
  const counts = await page.evaluate(() => {
    const held = (
      window as unknown as {
        __held: { contexts: WebGL2RenderingContext[]; draws: number; observers: Set<unknown> };
      }
    ).__held;
    return {
      contexts: held.contexts.length,
      liveContexts: held.contexts.filter((context) => !context.isContextLost()).length,
      draws: held.draws,
      observing: held.observers.size,
    };
  });
  await cdp.detach();
  return { ...counts, visibilityListeners, schemeListeners };
}

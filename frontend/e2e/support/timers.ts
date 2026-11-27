import type { Page } from '@playwright/test';

/**
 * Records, from before the app starts, every timeout and interval the page sets and clears, so a
 * spec can count the ones that are waiting: the timers a screen holds while it is open.
 */
export async function watchTimers(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const waiting = new Map<number, { delay: number; repeats: boolean }>();
    Object.assign(window, { __timers: waiting });
    const { setTimeout, setInterval, clearTimeout, clearInterval } = window;
    window.setTimeout = ((handler: TimerHandler, delay = 0, ...rest: unknown[]) => {
      const id: number = setTimeout(
        (...args: unknown[]) => {
          waiting.delete(id);
          if (typeof handler === 'function') (handler as (...a: unknown[]) => void)(...args);
        },
        delay,
        ...rest,
      );
      waiting.set(id, { delay, repeats: false });
      return id;
    }) as typeof window.setTimeout;
    window.setInterval = ((handler: TimerHandler, delay = 0, ...rest: unknown[]) => {
      const id: number = setInterval(handler, delay, ...rest);
      waiting.set(id, { delay, repeats: true });
      return id;
    }) as typeof window.setInterval;
    window.clearTimeout = ((id?: number) => {
      if (id !== undefined) waiting.delete(id);
      clearTimeout(id);
    }) as typeof window.clearTimeout;
    window.clearInterval = ((id?: number) => {
      if (id !== undefined) waiting.delete(id);
      clearInterval(id);
    }) as typeof window.clearInterval;
  });
}

/** The timers waiting now that are a second or longer, or repeat: what ticks while a screen is open. */
export async function ticking(page: Page): Promise<{ delay: number; repeats: boolean }[]> {
  return page.evaluate(() =>
    [
      ...(
        window as unknown as { __timers: Map<number, { delay: number; repeats: boolean }> }
      ).__timers.values(),
    ].filter((timer) => timer.repeats || timer.delay >= 1000),
  );
}

import { InjectionToken, type Signal } from '@angular/core';

/** The one clock the browser reads the time from. A test moves it; nothing calls `Date.now()` itself. */
export interface Clock {
  /** Milliseconds since the epoch. */
  now(): number;
  /**
   * The start of the current minute, in milliseconds since the epoch. It changes once a minute,
   * so what depends on the time (the night side, a local time) follows it. It rests while the
   * tab is hidden and catches up as soon as the tab is shown.
   */
  readonly minute: Signal<number>;
}

export const CLOCK = new InjectionToken<Clock>('Clock');

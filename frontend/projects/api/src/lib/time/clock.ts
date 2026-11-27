import { InjectionToken } from '@angular/core';

/** The one clock the browser reads the time from. A test moves it; nothing calls `Date.now()` itself. */
export interface Clock {
  /** Milliseconds since the epoch. */
  now(): number;
}

export const CLOCK = new InjectionToken<Clock>('Clock');

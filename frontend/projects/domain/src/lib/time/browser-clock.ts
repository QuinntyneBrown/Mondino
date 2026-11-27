import { DestroyRef, DOCUMENT, inject, Injectable, signal } from '@angular/core';
import type { Clock } from '@mondino/api';

const minuteMs = 60_000;
const startOfMinute = (time: number) => time - (time % minuteMs);

/**
 * The app's one clock: the system's time, and a minute that ticks when each minute begins. While
 * the tab is hidden it holds no timer; shown again, it catches up at once.
 */
@Injectable()
export class BrowserClock implements Clock {
  private readonly document = inject(DOCUMENT);
  private readonly current = signal(startOfMinute(Date.now()));
  private timer: ReturnType<typeof setTimeout> | undefined;

  readonly minute = this.current.asReadonly();

  constructor() {
    const onVisibility = () => (this.document.hidden ? this.rest() : this.tick());
    this.document.addEventListener('visibilitychange', onVisibility);
    inject(DestroyRef).onDestroy(() => {
      this.document.removeEventListener('visibilitychange', onVisibility);
      this.rest();
    });
    this.schedule();
  }

  now(): number {
    return Date.now();
  }

  private tick(): void {
    this.current.set(startOfMinute(Date.now()));
    this.schedule();
  }

  private schedule(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.tick(), minuteMs - (Date.now() % minuteMs));
  }

  private rest(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
  }
}

import { DestroyRef, inject, Injectable, signal } from '@angular/core';

/** A toast: a success goes by itself after 4 seconds; a danger stays until it is dismissed. */
export interface ToastMessage {
  readonly tone: 'success' | 'danger';
  readonly strong: string | null;
  readonly text: string;
}

/** How long a success toast stays before it goes by itself (L2-005, L2-025). */
export const toastLifetime = 4000;

/**
 * The one toast on the teammate screens, which `TeamShell` renders: a success in a status region,
 * a danger in an alert region. Showing another replaces it. A success's time stands still while it
 * is held, pointed at or focused, and the rest runs once it is let go (L2-054). Provided by
 * `TeamShell`, so its timer goes with the shell.
 */
@Injectable()
export class Toaster {
  readonly current = signal<ToastMessage | null>(null);
  private timer: ReturnType<typeof setTimeout> | undefined;
  /** When the shown success goes, while its time runs; how long it has left, while it is held. */
  private endsAt = 0;
  private left: number | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  show(toast: ToastMessage): void {
    clearTimeout(this.timer);
    this.left = null;
    this.current.set(toast);
    if (toast.tone === 'success') this.run(toastLifetime);
  }

  /** The toast is pointed at or focused: its time stands still. */
  hold(): void {
    if (this.current()?.tone !== 'success' || this.left !== null) return;
    clearTimeout(this.timer);
    this.left = Math.max(0, this.endsAt - Date.now());
  }

  /** The toast is let go: the time it had left runs. */
  release(): void {
    if (this.left === null) return;
    const left = this.left;
    this.left = null;
    if (this.current()?.tone === 'success') this.run(left);
  }

  dismiss(): void {
    clearTimeout(this.timer);
    this.left = null;
    this.current.set(null);
  }

  private run(time: number): void {
    this.endsAt = Date.now() + time;
    this.timer = setTimeout(() => this.dismiss(), time);
  }
}

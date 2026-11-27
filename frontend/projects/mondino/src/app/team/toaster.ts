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
 * a danger in an alert region. Showing another replaces it. Provided by `TeamShell`, so its timer
 * goes with the shell.
 */
@Injectable()
export class Toaster {
  readonly current = signal<ToastMessage | null>(null);
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  show(toast: ToastMessage): void {
    clearTimeout(this.timer);
    this.current.set(toast);
    if (toast.tone === 'success') this.timer = setTimeout(() => this.dismiss(), toastLifetime);
  }

  dismiss(): void {
    clearTimeout(this.timer);
    this.current.set(null);
  }
}

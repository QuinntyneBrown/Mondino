import { InjectionToken } from '@angular/core';

/** Writes text to the clipboard. It rejects when the browser refuses the copy. */
export interface Clipboard {
  write(text: string): Promise<void>;
}

export const CLIPBOARD = new InjectionToken<Clipboard>('Clipboard');

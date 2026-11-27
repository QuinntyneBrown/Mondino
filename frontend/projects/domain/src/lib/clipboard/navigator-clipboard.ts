import { Injectable } from '@angular/core';
import type { Clipboard } from '@mondino/api';

/**
 * The clipboard through `navigator.clipboard.writeText` (docs/adr/0009), which rejects when the
 * browser refuses, or has no clipboard to offer.
 */
@Injectable()
export class NavigatorClipboard implements Clipboard {
  write(text: string): Promise<void> {
    if (!navigator.clipboard) return Promise.reject(new Error('No clipboard'));
    return navigator.clipboard.writeText(text);
  }
}

import type { Page } from '@playwright/test';

/**
 * What a visit leaves behind and sends out: every request the page made, and everything the
 * browser keeps (the address bar, local and session storage, every IndexedDB store and the
 * cookies), so a spec can look for what must never be there.
 */
export class BrowserRecord {
  readonly requests: string[] = [];

  constructor(readonly page: Page) {
    page.on('request', (request) => this.requests.push(request.url()));
  }

  /** The origins every recorded request went to. */
  origins(): string[] {
    return [...new Set(this.requests.map((url) => new URL(url).origin))];
  }

  /** Everything the browser keeps at this moment, as text. */
  async everythingKept(): Promise<string> {
    const kept = await this.page.evaluate(async () => {
      const all = (storage: Storage) =>
        Array.from({ length: storage.length }, (_, i) => {
          const key = storage.key(i) ?? '';
          return `${key}=${storage.getItem(key)}`;
        }).join(';');
      const stores: string[] = [];
      for (const { name } of await indexedDB.databases()) {
        if (!name) continue;
        const database = await new Promise<IDBDatabase>((resolve, reject) => {
          const opening = indexedDB.open(name);
          opening.onsuccess = () => resolve(opening.result);
          opening.onerror = () => reject(opening.error);
        });
        for (const store of Array.from(database.objectStoreNames)) {
          const values = await new Promise<unknown[]>((resolve, reject) => {
            const reading = database.transaction(store).objectStore(store).getAll();
            reading.onsuccess = () => resolve(reading.result);
            reading.onerror = () => reject(reading.error);
          });
          stores.push(`${name}/${store}=${JSON.stringify(values)}`);
        }
        database.close();
      }
      return [
        location.href,
        history.length,
        all(localStorage),
        all(sessionStorage),
        stores.join(';'),
        document.cookie,
      ].join('|');
    });
    const cookies = await this.page.context().cookies();
    return `${kept}|${JSON.stringify(cookies)}`;
  }
}

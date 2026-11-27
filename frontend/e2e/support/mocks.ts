import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** A mock's markup, read from docs/mocks/: the design every screen is drawn as. */
export function mockMarkup(path: string): string {
  return readFileSync(resolve(__dirname, '../../../docs/mocks', path), 'utf8');
}

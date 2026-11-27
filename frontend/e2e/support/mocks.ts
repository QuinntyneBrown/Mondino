import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** A mock's markup, read from docs/mocks/: the design every screen is drawn as. */
export function mockMarkup(path: string): string {
  return readFileSync(resolve(__dirname, '../../../docs/mocks', path), 'utf8');
}

/**
 * The shapes of the icon in a mock's resting pin label whose local time is `time` ("15:05"), each
 * as its tag and its attributes in order of name: how an icon is compared with the mock's.
 */
export function labelIconIn(path: string, time: string): string[] {
  const markup = mockMarkup(path);
  const found = new RegExp(
    `<span class="pin-label[^"]*"[^>]*><strong>${time}</strong><svg[^>]*>(.*?)</svg>`,
  ).exec(markup);
  if (!found) throw new Error(`No label at ${time} with an icon in ${path}`);
  return [...found[1].matchAll(/<(\w+)([^>]*?)\/?>/g)].map(([, tag, attributes]) =>
    [
      tag,
      ...[...attributes.matchAll(/([\w-]+)="([^"]*)"/g)]
        .map(([, name, value]) => `${name}=${value}`)
        .sort(),
    ].join(' '),
  );
}

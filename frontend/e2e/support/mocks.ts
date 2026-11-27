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

/** The text of the first element with `className` in a markup, tags taken out; or null. */
function textOf(markup: string, className: string): string | null {
  const found = new RegExp(`<(\\w+) class="${className}(?: [^"]*)?"[^>]*>([\\s\\S]*?)</\\1>`).exec(
    markup,
  );
  if (!found) return null;
  return found[2]
    .replace(/<svg[\s\S]*?<\/svg>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The shapes of an icon's markup, each as its tag and its attributes in order of name. */
function shapesOf(svg: string): string[] {
  const inner = /<svg[^>]*>([\s\S]*?)<\/svg>/.exec(svg)?.[1] ?? '';
  return [...inner.matchAll(/<(\w+)([^>]*?)\/?>/g)].map(([, tag, attributes]) =>
    [
      tag,
      ...[...attributes.matchAll(/([\w-]+)="([^"]*)"/g)]
        .map(([, name, value]) => `${name}=${value}`)
        .sort(),
    ].join(' '),
  );
}

/** What a mock's teammate panel says, part by part, as a spec compares it with the screen's. */
export interface MockPanel {
  name: string | null;
  place: string | null;
  clock: string | null;
  day: string | null;
  status: string | null;
  temperature: string | null;
  sky: string | null;
  weatherNote: string | null;
  note: string | null;
  overlapWhen: string | null;
  overlapText: string | null;
  /** The weather icon's shapes, and its accessible name. */
  weatherIcon: string[];
  weatherIconName: string | null;
  /** The overlap bar's parts: each part's class and its --from and --span. */
  barParts: string[];
  announcement: string | null;
}

export function mockPanel(path: string): MockPanel {
  const markup = mockMarkup(path);
  const panel = markup.slice(markup.indexOf('<aside'), markup.indexOf('</main>'));
  const weather = /<div class="person__weather">(<svg[\s\S]*?<\/svg>)/.exec(panel)?.[1] ?? '';
  return {
    name: textOf(panel, 'person__name'),
    place: textOf(panel, 'person__place'),
    clock: textOf(panel, 'person__clock'),
    day: textOf(panel, 'person__day'),
    status: textOf(panel, 'status'),
    temperature: textOf(panel, 'person__temp'),
    sky: textOf(panel, 'person__sky'),
    weatherNote: textOf(panel, 'person__weather person__weather--note'),
    note: textOf(panel, 'panel__note'),
    overlapWhen: textOf(panel, 'overlap__when'),
    overlapText: textOf(panel, 'overlap__text'),
    weatherIcon: shapesOf(weather),
    weatherIconName: /aria-label="([^"]*)"/.exec(weather)?.[1] ?? null,
    barParts: [...panel.matchAll(/<span class="(overlap__\w+)" style="([^"]*)"/g)].map(
      ([, part, style]) => `${part} ${style}`,
    ),
    announcement: /<p class="visually-hidden" role="status"[^>]*>([^<]*)</.exec(panel)?.[1] ?? null,
  };
}

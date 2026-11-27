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
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
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

/** A row of a mock's Team table, part by part, as a spec compares it with the screen's. */
export interface MockTeamRow {
  /** The link's text, "(you)" with it. */
  name: string;
  /** Under 768 px: the city and the offset. */
  phone: string;
  /** The status in words under the name, or null. */
  status: string | null;
  /** The city, and the country under it. */
  city: string;
  country: string;
  time: string;
  offset: string;
  /** The weather's text, the degrees, and its icon's accessible name and shapes. */
  degrees: string;
  weatherName: string | null;
  weatherIcon: string[];
}

/** Every row of the Team table in a mock, in order. */
export function mockTeamRows(path: string): MockTeamRow[] {
  const markup = mockMarkup(path);
  return [...markup.matchAll(/<tr class="team-table__row">([\s\S]*?)<\/tr>/g)].map(([, row]) => {
    const weather = /<td class="team-table__weather[^"]*">([\s\S]*?)<\/td>/.exec(row)?.[1] ?? '';
    const svg = /<svg[\s\S]*?<\/svg>/.exec(weather)?.[0] ?? '';
    return {
      name: textOf(row, 'team-table__link') ?? '',
      phone: textOf(row, 'team-table__phone') ?? '',
      status: /<span class="team-table__sub">([^<]*)<\/span><\/span><\/th>/.exec(row)?.[1] ?? null,
      city: /<td class="team-table__location">([^<]*)</.exec(row)?.[1] ?? '',
      country:
        /<td class="team-table__location">[^<]*<span class="team-table__sub">([^<]*)</.exec(
          row,
        )?.[1] ?? '',
      time: textOf(row, 'team-table__time') ?? '',
      offset: textOf(row, 'team-table__offset') ?? '',
      degrees: textOf(row, 'team-table__weather') ?? '',
      weatherName:
        /aria-label="([^"]*)"/.exec(svg)?.[1] ?? /aria-label="([^"]*)"/.exec(weather)?.[1] ?? null,
      weatherIcon: shapesOf(svg),
    };
  });
}

/** The day ribbon's markers in a mock, in order: where each sits, its row, its tooltip and its name. */
export function mockMarkers(
  path: string,
): { at: string; row: string; title: string; name: string }[] {
  const markup = mockMarkup(path).replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  return [
    ...markup.matchAll(
      /class="day-ribbon__marker"[^>]*style="--at: ([\d.]+)%; --row: (\d+)" title="([^"]*)" aria-label="([^"]*)"/g,
    ),
  ].map(([, at, row, title, name]) => ({ at, row, title, name }));
}

/** The hour marks under a mock's ribbon. */
export function mockScale(path: string): string[] {
  const scale = /<ul class="day-ribbon__scale[^"]*"[^>]*>([\s\S]*?)<\/ul>/.exec(mockMarkup(path));
  return [...(scale?.[1] ?? '').matchAll(/<li>([^<]*)<\/li>/g)].map(([, mark]) => mark);
}

/** A mock's day ribbon as a bar chart: its line, the picture's name, each bar's share and the count. */
export function mockBars(path: string): {
  summary: string;
  name: string;
  shares: string[];
  count: { bar: number; text: string };
} {
  const markup = mockMarkup(path);
  const bars = [
    ...(/<div class="day-ribbon__bars"[^>]*>([\s\S]*?)<\/div>/.exec(markup)?.[1] ?? '').matchAll(
      /<span class="day-ribbon__bar[^"]*" style="--share: ([\d.]+)">(?:<span class="day-ribbon__bar-count tnum">(\d+)<\/span>)?/g,
    ),
  ];
  const counted = bars.findIndex(([, , count]) => count);
  return {
    summary: textOf(markup, 'day-ribbon__summary') ?? '',
    name:
      /class="day-ribbon__track day-ribbon__track--density" role="img" aria-label="([^"]*)"/.exec(
        markup,
      )?.[1] ?? '',
    shares: bars.map(([, share]) => share),
    count: { bar: counted, text: bars[counted]?.[2] ?? '' },
  };
}

/** The city sections of a mock's large team, in order: each button's city, count, time and state. */
export function mockCitySections(
  path: string,
): { name: string; count: string; time: string; expanded: string }[] {
  return [
    ...mockMarkup(path).matchAll(
      /<button class="city-section__toggle" type="button" aria-expanded="(\w+)"[^>]*>[\s\S]*?<span class="city-section__name">([^<]*)<\/span><span class="city-section__count tnum">(\d+)<span class="visually-hidden"> teammates<\/span><\/span><span class="city-section__time tnum">([^<]*)<\/span>/g,
    ),
  ].map(([, expanded, name, count, time]) => ({ name, count, time, expanded }));
}

/** The text of the first element of a class in a mock, tags taken out. */
export function mockText(path: string, className: string): string | null {
  return textOf(mockMarkup(path), className);
}

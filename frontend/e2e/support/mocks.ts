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

/**
 * The shapes of an icon's markup, each as its tag and its attributes in order of name; Angular's
 * own attributes in a screen's markup are left out.
 */
export function shapesOf(svg: string): string[] {
  const inner = /<svg[^>]*>([\s\S]*?)<\/svg>/.exec(svg)?.[1] ?? '';
  return [...inner.matchAll(/<(\w+)([^>]*?)\/?>/g)].map(([, tag, attributes]) =>
    [
      tag,
      ...[...attributes.matchAll(/([\w-]+)="([^"]*)"/g)]
        .filter(([, name]) => !name.startsWith('_ng'))
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
  /** Each moment card: its kind and when, title and detail, and its emblem's icon's shapes. */
  moments: MockMomentCard[];
}

/** A moment card in a mock's teammate panel. */
export interface MockMomentCard {
  kind: string;
  title: string;
  detail: string;
  icon: string[];
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
    moments: [...panel.matchAll(/<div class="moment-card">([\s\S]*?)<\/div><\/div>/g)].map(
      ([, card]) => ({
        kind: textOf(card, 'moment-card__kind') ?? '',
        title: textOf(card, 'moment-card__title') ?? '',
        detail: textOf(card, 'moment-card__detail') ?? '',
        icon: shapesOf(card),
      }),
    ),
  };
}

/** A moment row of a mock's week around the world: its emblem, title, kind and teammate, and when. */
export interface MockWeekMoment {
  solid: boolean;
  icon: string[];
  title: string;
  /** The row's meta as a screen reader reads it: "Holiday, Liam · Dublin". */
  meta: string;
  when: string;
}

/** The moment rows of a mock's "This week around the world", in order. */
export function mockWeekMoments(path: string): MockWeekMoment[] {
  const markup = mockMarkup(path);
  const week = markup.slice(
    markup.indexOf('id="week-title"'),
    markup.indexOf('id="working-title"'),
  );
  return [...week.matchAll(/<a class="row"[^>]*>([\s\S]*?)<\/a>/g)].map(([, row]) => ({
    solid: /class="emblem emblem--solid"/.test(row),
    icon: shapesOf(row),
    title: textOf(row, 'row__title') ?? '',
    // The meta holds the kind for assistive technology in a span of its own, so it ends at its row
    meta: (/<span class="row__meta">([\s\S]*?)<\/span><\/span>/.exec(row)?.[1] ?? '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim(),
    when: textOf(row, 'row__trail') ?? '',
  }));
}

/** "Coming up" in a mock's Team row: the pill's icon's name and shapes, title and when; or null for a dash. */
export interface MockComingUp {
  iconName: string | null;
  icon: string[];
  title: string;
  when: string;
}

/** "Coming up" of each row of a mock's Team table, by the row's link text. */
export function mockComingUp(path: string): Map<string, MockComingUp | null> {
  const markup = mockMarkup(path);
  return new Map(
    [...markup.matchAll(/<tr class="team-table__row">([\s\S]*?)<\/tr>/g)].map(([, row]) => {
      const cell = /<td class="team-table__moment">([\s\S]*?)<\/td>/.exec(row)?.[1] ?? '';
      const pill = /<span class="moment-pill">/.test(cell)
        ? {
            iconName: /aria-label="([^"]*)"/.exec(cell)?.[1] ?? null,
            icon: shapesOf(cell),
            title: textOf(cell, 'moment-pill__title') ?? '',
            when: textOf(cell, 'moment-pill__when') ?? '',
          }
        : null;
      return [textOf(row, 'team-table__link') ?? '', pill];
    }),
  );
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

/** A pin's moment marker in a mock: the pin's accessible name, the marker's classes, its count or icon. */
export interface MockPinMarker {
  name: string;
  className: string;
  count: string;
  icon: string[];
}

/** The pins of a mock that carry a moment marker, in the mock's order. */
export function mockPinMarkers(path: string): MockPinMarker[] {
  return [
    ...mockMarkup(path).matchAll(
      /<button class="pin [^"]*"[^>]*aria-label="([^"]*)"><span aria-hidden="true">[^<]*<\/span><span class="(moment-marker[^"]*)"[^>]*>([\s\S]*?)<\/span><\/button>/g,
    ),
  ].map(([, name, className, inside]) => ({
    name,
    className,
    count: inside.startsWith('<svg') ? '' : inside.trim(),
    icon: inside.startsWith('<svg') ? shapesOf(inside) : [],
  }));
}

/** A mock's lifted pin label, whose name line is `nameAndCity`: its text, and its moment line's icon. */
export function mockLiftedLabel(
  path: string,
  nameAndCity: string,
): { text: string; momentIcon: string[] } {
  const found = new RegExp(
    `<span class="pin-label pin-label--lifted[^"]*"[^>]*><span class="pin-label__name">${nameAndCity}</span>([\\s\\S]*?)</span></li>`,
  ).exec(mockMarkup(path));
  if (!found) throw new Error(`No lifted label for ${nameAndCity} in ${path}`);
  const moment = /<span class="pin-label__moment">(<svg[\s\S]*?<\/svg>)/.exec(found[1]);
  return {
    text: (
      nameAndCity + found[1].replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, '')
    ).replace(/\s+/g, ''),
    momentIcon: moment ? shapesOf(moment[1]) : [],
  };
}

/** A moment of a mock's Moments screen, part by part, as a spec compares it with the screen's. */
export interface MockMomentRow {
  /** "Fri 31 Oct". */
  date: string;
  /** The kind and when: "Local event · In 4 days". */
  kind: string;
  /** The shapes of the kind's icon. */
  icon: string[];
  title: string;
  detail: string;
  /** "Jordan · Austin". */
  who: string;
  initials: string;
  /** The avatar's colour class: "hue-12". */
  hue: string;
}

/** Today's moment card of a mock's Moments screen, part by part; or null. */
export interface MockTodayMoment {
  kicker: string;
  title: string;
  detail: string;
  go: string;
  icon: string[];
}

/** The headings of a mock's moment groups, in order: "This week", "Later". */
export function mockMomentGroups(path: string): string[] {
  return [...mockMarkup(path).matchAll(/<h2 class="moment-group__title"[^>]*>([^<]*)<\/h2>/g)].map(
    ([, title]) => title,
  );
}

/** Every moment row of a mock's Moments screen, in order. */
export function mockMomentRows(path: string): MockMomentRow[] {
  return [...mockMarkup(path).matchAll(/<a class="moment-row"[^>]*>([\s\S]*?)<\/a>/g)].map(
    ([, row]) => {
      const kind = /<span class="moment-row__kind">([\s\S]*?)<\/span>/.exec(row)?.[1] ?? '';
      const avatar = /<span class="avatar avatar--xs (hue-\d+)"[^>]*>([^<]*)<\/span>/.exec(row);
      return {
        date: [
          textOf(row, 'date-block__weekday'),
          textOf(row, 'date-block__day'),
          textOf(row, 'date-block__month'),
        ].join(' '),
        kind: kind.replace(/<svg[\s\S]*?<\/svg>/g, '').trim(),
        icon: shapesOf(kind),
        title: textOf(row, 'moment-row__title') ?? '',
        detail: textOf(row, 'moment-row__detail') ?? '',
        who: /<span class="moment-row__who">[\s\S]*?<\/span>([^<]*)<\/span>/.exec(row)?.[1] ?? '',
        initials: avatar?.[2] ?? '',
        hue: avatar?.[1] ?? '',
      };
    },
  );
}

/** The mock's card for today's moment; or null when it draws none. */
export function mockTodayMoment(path: string): MockTodayMoment | null {
  const card = /<a class="today-moment"[^>]*>([\s\S]*?)<\/a>/.exec(mockMarkup(path))?.[1];
  if (!card) return null;
  return {
    kicker: textOf(card, 'today-moment__kicker') ?? '',
    title: textOf(card, 'today-moment__title') ?? '',
    detail: textOf(card, 'today-moment__detail') ?? '',
    go: textOf(card, 'today-moment__go') ?? '',
    icon: shapesOf(card),
  };
}

/** The filters of a mock's Moments screen: each one's name, whether it is pressed, its icon. */
export function mockFilterChips(path: string): { name: string; pressed: string; icon: string[] }[] {
  return [
    ...mockMarkup(path).matchAll(
      /<button class="chip" type="button" aria-pressed="(\w+)">([\s\S]*?)<\/button>/g,
    ),
  ].map(([, pressed, inner]) => ({
    name: inner.replace(/<svg[\s\S]*?<\/svg>/g, '').trim(),
    pressed,
    icon: shapesOf(inner),
  }));
}

/** A mock's banner, read as `RefreshBannerPage.parts` reads the screen's. */
export function mockBanner(path: string): {
  role: string;
  text: string;
  button: string;
  icons: string[][];
} {
  const markup = mockMarkup(path);
  const banner = /<div class="banner" role="(\w+)">([\s\S]*?)<\/button><\/div>/.exec(markup);
  if (!banner) throw new Error(`No banner in ${path}`);
  return {
    role: banner[1],
    text: textOf(banner[0] + '</div>', 'banner__text') ?? '',
    button: (/<button[^>]*>([\s\S]*)$/.exec(banner[2])?.[1] ?? '')
      .replace(/<svg[\s\S]*?<\/svg>/g, '')
      .replace(/\s+/g, ' ')
      .trim(),
    icons: [...banner[0].matchAll(/<svg[\s\S]*?<\/svg>/g)].map(([svg]) => shapesOf(svg)),
  };
}

// Traces to: L2-056, L2-044
import type { TeamRow } from '@mondino/api';
import { cast, pin } from './cast.testing';
import { citySections, searchRows } from './city-sections';
import { teamRows } from './team-rows';

const now = Date.UTC(2025, 9, 27, 14, 5);
const rows = teamRows(cast, now, '24-hour', 'celsius');
const city = (name: string, count: number, timeZoneId = 'Europe/London', longitude = -0.13) =>
  Array.from({ length: count }, (_, index) =>
    pin(`${name} ${String(index).padStart(2, '0')}`, timeZoneId, longitude, { cityName: name }),
  );

describe('searchRows', () => {
  const names = (query: string) => searchRows(rows, query).map((row) => row.name);

  it('keeps every row for an empty or blank search', () => {
    expect(searchRows(rows, '')).toHaveLength(13);
    expect(searchRows(rows, '   ')).toHaveLength(13);
  });

  it('finds a name or a city by any part, without regard to case or accents', () => {
    expect(names('tomas')).toEqual(['Tomás Herrera']);
    expect(names('  O’CONNOR ')).toEqual(['Liam O’Connor']);
    expect(names('liam')).toEqual(['Liam O’Connor', 'Noah Williams']);
    expect(names('ferri')).toEqual(['Luca Ferri']);
    // Every row's city is the pin's name in the cast; a city of many is found whole
    const sao = teamRows(
      city('São Paulo', 3, 'America/Sao_Paulo', -46.63),
      now,
      '24-hour',
      'celsius',
    );
    expect(searchRows(sao, 'sao paulo')).toHaveLength(3);
    expect(searchRows(sao, 'São')).toHaveLength(3);
  });

  it('finds no one for a city no teammate lives in, and reads markup as text', () => {
    expect(names('Reykjavik')).toEqual([]);
    expect(names('<img src=x onerror=alert(1)>')).toEqual([]);
  });

  it('keeps the order it is given', () =>
    expect(names('a')).toEqual(rows.filter((row) => /a/i.test(row.name)).map((row) => row.name)));
});

describe('citySections', () => {
  const sectionsOf = (list: readonly TeamRow[], toggled = new Map<string, boolean>()) =>
    citySections(list, toggled);

  it('gives one section per city, west to east, with its count and local time, the first two open', () => {
    const sections = sectionsOf(rows);
    expect(
      sections.map((section) => `${section.name} ${section.count} ${section.localTime}`),
    ).toEqual(rows.map((row) => `${row.cityName} 1 ${row.localTime}`));
    expect(sections.map((section) => section.open)).toEqual([true, true, ...Array(11).fill(false)]);
    expect(sections[0].rows.map((row) => row.name)).toEqual(['Tomás Herrera']);
    expect(sections[2].rows).toEqual([]);
  });

  it('gathers a city’s teammates in one section, in the order they arrive', () => {
    const list = teamRows(
      [...city('London', 3), ...city('Milan', 2, 'Europe/Rome', 9.19)],
      now,
      '24-hour',
      'celsius',
    );
    const sections = sectionsOf(list);
    expect(sections.map((section) => [section.name, section.count])).toEqual([
      ['London', 3],
      ['Milan', 2],
    ]);
    expect(sections[0].rows.map((row) => row.name)).toEqual([
      'London 00',
      'London 01',
      'London 02',
    ]);
  });

  it('tells two cities of one name apart by their country', () => {
    const list = teamRows(
      [
        pin('A', 'America/Toronto', -81.25, { cityName: 'London', country: 'Canada' }),
        pin('B', 'Europe/London', -0.13, { cityName: 'London', country: 'United Kingdom' }),
      ],
      now,
      '24-hour',
      'celsius',
    );
    expect(sectionsOf(list).map((section) => section.key)).toEqual([
      'London, Canada',
      'London, United Kingdom',
    ]);
  });

  it('opens or closes a section as the teammate chose, over the first two', () => {
    const sections = sectionsOf(
      rows,
      new Map([
        [`${rows[0].cityName}, `, false],
        [`${rows[5].cityName}, `, true],
      ]),
    );
    expect(sections.filter((section) => section.open).map((section) => section.name)).toEqual([
      rows[1].cityName,
      rows[5].cityName,
    ]);
  });

  it('holds an open city’s first 50 rows and counts the rest', () => {
    const london = teamRows(city('London', 64), now, '24-hour', 'celsius');
    const [section] = sectionsOf(london);
    expect(section.count).toBe(64);
    expect(section.rows).toHaveLength(50);
    expect(section.rows[49].name).toBe('London 49');
    expect(section.more).toBe(14);
    expect(sectionsOf(london, new Map([['London, ', false]]))[0]).toEqual(
      expect.objectContaining({ open: false, rows: [], more: 0 }),
    );
  });

  it('gives no section when no row is left', () => expect(sectionsOf([])).toEqual([]));
});

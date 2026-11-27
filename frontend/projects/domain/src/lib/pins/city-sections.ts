import type { CitySectionContent, TeamRow } from '@mondino/api';

/** An open city section holds at most this many rows (L2-056). */
export const CityRowLimit = 50;

/** Past this many teammates a team is large: a bar chart, a search and a section per city. */
export const LargeTeamThreshold = 40;

/** Lower case with combining marks taken off, so "sao" finds São Paulo. */
const folded = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/**
 * The rows whose name or city contains `query` (L2-056), without regard to case or accents, in
 * their order. A blank query keeps every row. What is typed is only compared, never run.
 */
export function searchRows(rows: readonly TeamRow[], query: string): TeamRow[] {
  const wanted = folded(query.trim());
  if (!wanted) return [...rows];
  return rows.filter(
    (row) => folded(row.name).includes(wanted) || folded(row.cityName).includes(wanted),
  );
}

/**
 * A large team's list city by city (L2-056): the rows gathered under their city, in the order they
 * arrive, which is west to east. A city is open when the teammate opened it, or when it is one of
 * the first two and they have not closed it; an open city holds its first 50 rows and counts the
 * rest, a closed one holds none, so the rows in the page stay bounded (L2-047). `toggled` maps a
 * city's key to whether the teammate opened or closed it.
 */
export function citySections(
  rows: readonly TeamRow[],
  toggled: ReadonlyMap<string, boolean>,
): CitySectionContent[] {
  const cities = new Map<string, TeamRow[]>();
  for (const row of rows) {
    const key = `${row.cityName}, ${row.country}`;
    const city = cities.get(key);
    if (city) city.push(row);
    else cities.set(key, [row]);
  }
  return [...cities].map(([key, cityRows], index) => {
    const open = toggled.get(key) ?? index < 2;
    const shown = open ? cityRows.slice(0, CityRowLimit) : [];
    return {
      key,
      name: cityRows[0].cityName,
      count: cityRows.length,
      localTime: cityRows[0].localTime,
      open,
      rows: shown,
      more: open ? cityRows.length - shown.length : 0,
    };
  });
}

# 0006: The postal code source is GeoNames, and the city comes from Mondino's own list

**Status:** Accepted (journey 3, Place a pin from a postal code)

## Context

Join turns a country and a postal code into a city: its name, its region, the city's own
position and its IANA time zone (L2-003, L2-006). A pin is placed at the city, never at the
postal code's own position, and two postal codes in Toronto must give one position. When the
source is down, the person picks their city from a list the backend serves from its own data
(L2-004), so that list exists whatever source is chosen.

No postal code service answers all four things for the thirteen supported countries. Most give
a place name, a region and the postal code's own coordinates; none gives a time zone, and none
covers Ghana or the United Arab Emirates, which has no postal codes.

## Decision

- **Mondino holds its cities itself.** `BundledCityDirectory` reads `cities.tsv.gz`, an embedded
  resource of `Mondino.Infrastructure`, loaded once: the GeoNames `cities15000` export (every
  place of 15,000 people or more, less the sections of a city such as Milan's Brera) for the
  thirteen countries, with each city's GeoNames id, name,
  region (`admin1CodesASCII`), position, IANA time zone and population, about 13,200 cities.
  `tools/cities/build-cities.mjs` rebuilds it from the GeoNames dumps. The data is CC BY 4.0;
  `tools/cities/README.md` carries the attribution. It serves the city search of "Your city"
  (prefix of the name, accents and case ignored, largest first, at most 8) and the resolution of
  a postal code to its city.
- **The postal code source is the GeoNames postal code search web service**
  (`postalCodeSearchJSON`, `https://secure.geonames.org/`), CC BY 4.0, free for 10,000 credits a
  day and 1,000 an hour on one account; GeoNames' premium service lifts the limits and adds an
  SLA, with the same API. It answers the place name, region and coordinates of a postal code.
- **The source is given the part of the postal code that names an area, and the country.** A
  Canadian postal code is sent as its forward sortation area (`L5B`), an Irish Eircode as its
  routing key (`D02`), a US ZIP+4 as its five digits; the rest are sent whole. That is all a city
  needs, and the source never learns a street (L2-050). Nothing else is sent: no name, team,
  token, session or client address.
- **The city is resolved by Mondino, never taken from the source's coordinates.**
  `PostalCodeCityResolver` takes the source's place and picks, in the same country, the city in
  the directory whose name matches the place's name (accents, case and a trailing part in
  parentheses ignored), nearest the place if several match; failing that, the directory's city
  nearest the place. The pin gets that city's own position and time zone. The source's
  coordinates choose the city and go no further. A rural postal code therefore lands on the
  nearest city Mondino holds (L2-006).
- **Ghana and the United Arab Emirates** are not covered by the source. Their postal codes are
  still checked for their form, and then the lookup answers `Unavailable` without calling the
  source, so the person picks their city (L2-004). Whether Join should name this case in its
  own words is an open question in the detailed design.
- **Timeout, cache and breaker** (`CachedPostalCodeLookup`): a call has 5 seconds (L2-049).
  `Found` is cached for 30 days and `NotFound` for 1 day, by country and normalised postal code,
  at most 10,000 entries; `Unavailable` is not cached. After 5 failures in a row the breaker
  opens for 30 seconds and the lookup answers `Unavailable` without calling. Time comes from
  `TimeProvider`.
- **No log carries the request.** The source's `HttpClient` has its loggers removed, since the
  default `IHttpClientFactory` logging writes the URL, which carries the postal code (L2-051).

## Settings

| Setting | Meaning | Default |
|---|---|---|
| `PostalCodeSource:Username` | The GeoNames account the source is called with. Without it, every lookup answers `Unavailable` and Join offers "Your city". | none |
| `PostalCodeSource:BaseAddress` | The GeoNames web service. | `https://secure.geonames.org/` |

## Consequences

- The API ships about 310 kB of compressed city data and holds it in memory, once.
- A postal code whose place is not in the directory resolves to the nearest city of 15,000 or
  more; a smaller town is pinned at its larger neighbour.
- The rate limits of the free account are shared by every team. A deployment that outgrows them
  moves to GeoNames premium by changing `PostalCodeSource:BaseAddress`.
- Changing the source changes only `GeoNamesPostalCodeLookup`; the resolver, the directory and
  the cache stay.

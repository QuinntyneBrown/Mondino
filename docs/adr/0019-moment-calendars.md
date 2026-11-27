# 0019: Holidays come from OpenHolidays and Mondino's own calendar; races, events and sport from Mondino's own calendar

**Status:** Accepted (journey 19, Find moments). Follows [ADR 0006](0006-postal-code-source.md) and
[ADR 0015](0015-weather-source.md) for an outside source behind an interface.

## Context

A moment is a holiday, Formula 1, a local event or sport where a teammate lives (L2-020). The
`find-moments` design left the provider behind each calendar, how a region is named and matched,
the day a race weekend is dated, the cache's lifetime and the emblems Mondino may show as
`<TO SUPPLY>`. The instructions ask for public calendars first, behind interfaces in
`Mondino.Application`, called only by the backend, with a timeout and a cache, given a place and
never a teammate. Their terms were checked on 27 November 2026:

| Candidate | Covers | Terms | Chosen |
|---|---|---|---|
| [OpenHolidays API](https://www.openholidaysapi.org) | Public holidays of 36 countries, national and by ISO 3166-2 subdivision; of Mondino's thirteen, Brazil, Germany, Ireland, Italy, Mexico and Sweden | Data under the Open Database Licence 1.0: commercial use allowed, with attribution; no key, no stated limit | Yes, for holidays |
| Nager.Date (`date.nager.at`, now `nagerholidays.com`) | Public holidays of 100+ countries | "The Web API can be used for private or non-profit projects. For commercial purposes we require active sponsorship." | No: Mondino is not known to be non-commercial |
| Jolpica-F1 (Ergast's successor) | Formula 1 race weekends | Data CC BY-NC-SA 4.0; "freely available for non-commercial use" | No, for the same reason |
| Ticketmaster, PredictHQ and other event APIs | Local events and fixtures | A key and a contract each; caching and display restricted | No: none without an agreement Mondino does not hold |

No public calendar with terms Mondino can accept covers Formula 1, local events or sport, nor the
holidays of Australia, Ghana, India, Japan, the United Arab Emirates and the United States.

## Decision

- **Mondino keeps a calendar of its own** (`MondinoCalendar`), a JSON file embedded in
  `Mondino.Infrastructure` (`Moments/calendar.json`) and changed by pull request, as the city
  directory is (ADR 0006). It holds holidays the public calendar lacks, Formula 1 race weekends
  and the dated happenings of their own calendars (tickets going on sale), local events and sport
  fixtures, each with Mondino's own title and one line of detail. A date and a title of a public
  event are facts; the detail is Mondino's own words. It is read once and never grows, so it
  needs no timeout, cache or breaker. It implements `IRaceCalendar` and `IEventCalendar`, and
  gives `HolidayCalendar` its holidays.
- **Public holidays also come from the OpenHolidays API** (`OpenHolidaysCalendar`,
  `GET /PublicHolidays` with `countryIsoCode`, `languageIsoCode=EN`, `validFrom` and `validTo`,
  and `GET /Subdivisions` to name a subdivision), asked for a country and a calendar year and
  nothing else. Its client logs nothing, as every outside source's does.
- **`HolidayCalendar`**, the registered `IHolidayCalendar`, gives Mondino's own holidays and the
  public calendar's, and where both have a holiday in one country on one date (and one region, or
  none), Mondino's own entry is kept: its title and detail are the ones written for teammates.
  A public holiday's detail is "Public holiday in Ireland", or "Public holiday in Lombardy".
- **Timeout, cache and breaker** (`CachedOpenHolidays`): a call has 5 seconds (L2-049). A year of a
  country's holidays, with its subdivisions' names, is kept 24 hours, at most 1,000 entries; a
  failure is not kept. After 5 failures in a row the breaker opens for 30 seconds, and the source
  gives nothing without a call. Serving an older answer while the source fails is journey 26's
  (`survive-source-failure`).
- **A failing calendar never fails a read.** `MomentFinder` takes nothing from a calendar that
  throws, times out or has its breaker open, and returns the other calendars' moments.
- **A region is named in words**, the English name GeoNames gives a city's first-level division
  ("Lombardy", "Karnataka"), held as `City.Region`. OpenHolidays' subdivision codes are named
  through its `Subdivisions` answer in English; Mondino's own calendar names regions the same way.
  An entry belongs to a city's region when the two names are equal, ignoring case and accents. A
  holiday of a province or a city below the region (Bologna's St. Petronius) matches no region,
  and is not shown: Mondino would rather miss a local holiday than show one in the wrong city.
- **A race weekend is dated by its race day**, the Sunday ("São Paulo Grand Prix · 9 Nov"); a
  dated happening by its own day ("Monza tickets on sale · 12 Nov").
- **No emblem is held.** Mondino holds the right to no team's or series' logo, so
  `EmblemCatalogue` gives no key and every marker and emblem shows Mondino's own icon for the kind
  (a party popper, a flag, a ticket, a trophy). The name "Formula 1", a team's or a race's, is
  used only as words in a title. A logo is added only with a right recorded here.

## Settings

| Setting | Meaning | Default |
|---|---|---|
| `HolidaySource:BaseAddress` | The OpenHolidays API. | `https://openholidaysapi.org/` |

Mondino's own calendar has no setting: it is part of the build.

## Consequences

- A team's moments cost at most two calls per country a day (a year's holidays and its
  subdivisions), whatever the team's size, and none for six of Mondino's thirteen countries.
- OpenHolidays' data is under the ODbL and asks for attribution ("Holiday data © OpenHolidays
  API contributors, ODbL"). No mock draws where it goes; as Open-Meteo's (ADR 0015), it is an open
  question in `moments/find-moments`, to be drawn before Mondino is offered commercially.
- Mondino's own calendar must be kept: next season's races, events and fixtures are added by a
  pull request before they fall inside the 90 days a moment is looked for. A calendar that is not
  kept shows fewer moments, and nothing fails.
- Changing a provider changes only its adapter; the rule (`CalendarEntry.BelongsTo`), the finder
  and the handler stay.

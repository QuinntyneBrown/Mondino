# 0015: The weather comes from Open-Meteo, asked once per city and kept 15 minutes

**Status:** Accepted (journey 13, Show weather). Follows [ADR 0006](0006-postal-code-source.md)
for an outside source behind an interface.

## Context

Each pin carries the current temperature and one of eight conditions for its city (L2-018), and
the Join and Create Team screens name the weather at the city a postal code was found in
(L2-003). The instructions name Open-Meteo as the source and the backend as its only caller.
`weather/show-weather` left open the wind speed that turns a reading into "Windy": the WMO weather
codes Open-Meteo reports have no code for wind.

## Decision

- **The weather source is Open-Meteo's forecast API** (`v1/forecast`), asked for the `current`
  `temperature_2m` (°C), `weather_code` (WMO) and `wind_speed_10m` (km/h), the API's default
  units. `OpenMeteoWeatherSource` implements `IWeatherSource` in `Mondino.Infrastructure`.
- **It is given a position and nothing else.** The latitude and longitude are the city's own
  position (never a postal code's, ADR 0006) rounded to two decimal places, about a kilometre.
  The request carries no name, team, token, session or client address; with a commercial
  subscription it also carries the subscription's `apikey`, which names Mondino, not a teammate.
  The source's client has its loggers removed, as the postal code source's has.
- **One call per city.** `GetPinsQueryHandler` asks once for each distinct rounded position among
  the pins whose weather the viewer may see, in parallel. `CachedWeatherSource`, the registered
  `IWeatherSource`, keys on the same rounded position and returns an answer younger than
  15 minutes without a call (L2-018); concurrent requests for one key share one call. An answer
  is dropped once it is stale; at most 10,000 are held. A failure is not kept, so the next read
  asks again.
- **5 seconds.** A call that has not answered in 5 seconds (by `TimeProvider`) gives no weather.
  No answer, a status other than 200, or an answer without a temperature or a code gives no
  weather either. No weather is `WeatherState` `Unavailable`; the pin keeps its local time, and
  nothing fails.
- **The eight conditions.** `WeatherConditionMapper` maps the WMO code by the table in
  `weather/show-weather`; a code outside the table is `Cloudy`, so there is always an icon.
- **Windy is a sustained wind of 39 km/h or more at 10 m** (Beaufort force 6, a strong breeze,
  the force at which an umbrella is hard to hold), and applies only to a sky the code reports as
  clear, partly cloudy or cloudy: rain, showers, a storm or fog say more than the wind does.
- **The condition travels as a word of the web app's**: `clear`, `partly-cloudy`, `cloudy`,
  `rain`, `showers`, `storm`, `fog`, `wind`. The temperature travels in °C only; the browser
  converts it to the viewer's unit and rounds it.
- **The unit starts from the country in the browser.** Until Profile & Settings stores a choice
  (journey 23), the viewer's unit is °F when their pin is in the United States and °C elsewhere,
  as the clock's default is worked out (journey 11). On Join and Create Team it follows the
  country chosen in the form.
- **"Share my local weather"** is `Teammate.SharesWeather`, on to begin with, beside
  `SharesStatus`; off, the teammate's pin carries `WeatherState` `NotShared` and no weather for
  anyone else, and the source is not asked for their city on that teammate's account. The switch
  comes with journey 23.
- **Not yet:** the circuit breaker and serving an answer up to 3 hours old while the source fails
  come with journey 26 (`survive-source-failure`, L2-049).

## Settings

| Setting | Meaning | Default |
|---|---|---|
| `WeatherSource:BaseAddress` | Open-Meteo's API. A commercial subscription uses `https://customer-api.open-meteo.com/`. | `https://api.open-meteo.com/` |
| `WeatherSource:ApiKey` | The subscription's key, sent as `apikey`. Without it the free API is called, which Open-Meteo offers for non-commercial use. | none |

## Consequences

- A team in twelve cities costs at most twelve calls every 15 minutes, however many teammates
  live in each and however often they look; the free API's limit (10,000 calls a day) holds a
  few hundred busy teams' cities.
- Open-Meteo's data is CC BY 4.0 and asks for attribution. No mock draws where it goes; it is an
  open question in `weather/show-weather`.
- Changing the source changes only `OpenMeteoWeatherSource`; the mapper's table, the cache and
  the handler stay.

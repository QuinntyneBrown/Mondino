import type { ClockFormat, Pin, TeammatePanelContent, TemperatureUnit } from '@mondino/api';
import { compareWithViewer } from '../time/compare-with-viewer';
import { formatDay, formatTime, localTime } from '../time/local-time';
import { formatOffset } from '../time/offset';
import { statusFor } from '../time/status';
import { formatTemperature, isNightSky, weatherLabel } from '../weather/weather';
import { firstName } from './first-name';
import { initialsOf } from './initials';

/**
 * A selected teammate's panel at `now` (L2-023): their local time and own day (L2-014), the
 * offset in the panel's words (L2-016), the status (L2-015), the weather in the viewer's unit
 * (L2-018, L2-019) and the overlap (L2-017). The viewer's own panel has no offset or overlap; a
 * teammate who shares neither their weather nor their status gets the private note in place of
 * the three. The moments join with journey 19.
 */
export function teammatePanelView(
  pin: Pin,
  viewer: Pin | undefined,
  now: number,
  format: ClockFormat,
  unit: TemperatureUnit,
): TeammatePanelContent {
  const time = localTime(now, pin.timeZoneId);
  const comparison = compareWithViewer(pin, viewer, now, format);
  const name = firstName(pin.name);
  const keepsPrivate = !pin.sharesStatus && pin.weatherState === 'NotShared';
  return {
    teammateId: pin.teammateId,
    name: pin.name,
    firstName: name,
    initials: initialsOf(pin.name),
    colour: pin.colour,
    isViewer: pin.isViewer,
    cityName: pin.cityName,
    country: pin.country,
    localTime: formatTime(time, format),
    localDay: formatDay(time),
    offset: comparison ? formatOffset(comparison.offset, 'panel') : null,
    status: statusFor(pin, time),
    weather:
      pin.weatherState === 'Available' && pin.weather
        ? {
            temperature: formatTemperature(pin.weather.temperatureC, unit),
            condition: pin.weather.condition,
            night: isNightSky(time.hour),
            sky: weatherLabel(pin.weather.condition, pin.cityName),
          }
        : null,
    weatherState: pin.weatherState,
    weatherNote:
      pin.weatherState === 'Unavailable'
        ? `Weather for ${pin.cityName} isn’t available right now. We’ll try again in a few minutes.`
        : null,
    privateNote: keepsPrivate
      ? `${name} keeps their weather and working hours private. You’ll still see their local time and city.`
      : null,
    overlap: comparison?.overlap ?? null,
  };
}

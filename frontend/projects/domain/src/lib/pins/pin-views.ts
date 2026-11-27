import type { ClockFormat, Pin, PinView, Status } from '@mondino/api';
import { formatTime, localTime as localTimeAt } from '../time/local-time';
import { statusFor, statusWords } from '../time/status';
import { initialsOf } from './initials';

/**
 * What each pin shows at `now` (ADR 0014): its initials and colour, its name with "(you)" after
 * the viewer's own (L2-011), its city, its local time on the viewer's clock and its status
 * (L2-014, L2-015), and its accessible name. Worked out once a minute, every pin in one pass;
 * journeys 13 and 20 add the weather and the moments.
 */
export function pinViews(
  pins: readonly Pin[],
  now: number,
  newId: string | null = null,
  clockFormat: ClockFormat = '24-hour',
): Map<string, PinView> {
  const views = new Map<string, PinView>();
  for (const pin of pins) {
    const name = pin.isViewer ? `${pin.name} (you)` : pin.name;
    const time = localTimeAt(now, pin.timeZoneId);
    const localTime = formatTime(time, clockFormat);
    const status = statusFor(pin, time);
    views.set(pin.teammateId, {
      teammateId: pin.teammateId,
      initials: initialsOf(pin.name),
      colour: pin.colour,
      name,
      cityName: pin.cityName,
      localTime,
      status,
      description: describePin(name, pin.cityName, localTime, status),
      isViewer: pin.isViewer,
      isNew: pin.teammateId === newId,
    });
  }
  return views;
}

/** A pin's accessible name: "Tomás Herrera, Mexico City, 08:05, Early morning"; no status when not shared. */
export function describePin(
  name: string,
  cityName: string,
  localTime: string,
  status: Status | null = null,
): string {
  return [name, cityName, localTime, status && statusWords(status)].filter(Boolean).join(', ');
}

/**
 * A group pin's accessible name (L2-013): the teammates of a group of two, the viewer first,
 * "2 teammates close together: Sofia Bianchi (you), Luca Ferri"; the city of a larger group,
 * "14 teammates close together, Mexico City"; or how many cities it covers,
 * "60 teammates close together, 3 cities".
 */
export function describeGroup(pins: readonly PinView[]): string {
  const count = `${pins.length} teammates close together`;
  if (pins.length <= 2) {
    const names = [...pins].sort((a, b) => Number(b.isViewer) - Number(a.isViewer));
    return `${count}: ${names.map((pin) => pin.name).join(', ')}`;
  }
  const cities = new Set(pins.map((pin) => pin.cityName));
  return cities.size === 1 ? `${count}, ${pins[0].cityName}` : `${count}, ${cities.size} cities`;
}

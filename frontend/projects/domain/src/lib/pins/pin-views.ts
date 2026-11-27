import type { Pin, PinView } from '@mondino/api';
import { localTimeIn } from '../time/local-time';
import { initialsOf } from './initials';

/**
 * What each pin shows at `now` (ADR 0014): its initials and colour, its name with "(you)" after
 * the viewer's own (L2-011), its city and local time, and its accessible name. Worked out once a
 * minute; journeys 11, 13 and 20 add the status, the weather and the moments.
 */
export function pinViews(
  pins: readonly Pin[],
  now: number,
  newId: string | null = null,
): Map<string, PinView> {
  const views = new Map<string, PinView>();
  for (const pin of pins) {
    const name = pin.isViewer ? `${pin.name} (you)` : pin.name;
    const localTime = localTimeIn(pin.timeZoneId, now);
    views.set(pin.teammateId, {
      teammateId: pin.teammateId,
      initials: initialsOf(pin.name),
      colour: pin.colour,
      name,
      cityName: pin.cityName,
      localTime,
      description: describePin(name, pin.cityName, localTime),
      isViewer: pin.isViewer,
      isNew: pin.teammateId === newId,
    });
  }
  return views;
}

/** A pin's accessible name: "Tomás Herrera, Mexico City, 08:05". */
export function describePin(name: string, cityName: string, localTime: string): string {
  return [name, cityName, localTime].filter(Boolean).join(', ');
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

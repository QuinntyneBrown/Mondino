import type { Answer } from './api';
import { CITIES } from './invites';
import { idOf, type PinJson } from './pins';
import { NORTHWIND_MEMBERSHIP } from '../support/membership';

/** Where Profile & Settings reads and saves Sofia's own pin, and looks a new postal code up. */
export const NORTHWIND_ME = `/api/teams/${NORTHWIND_MEMBERSHIP.teamId}/me`;
export const NORTHWIND_ME_LOOKUPS = `${NORTHWIND_ME}/postal-code-lookups`;

/** Sofia's own pin, at a city of the cast or one a postal code found. */
function ownPin(city: 'Milan' | 'Toronto'): PinJson {
  const at = CITIES[city];
  return {
    teammateId: idOf('Sofia Bianchi'),
    name: 'Sofia Bianchi',
    colour: 'teammate-1',
    cityName: at.name,
    country: city === 'Milan' ? 'Italy' : 'Canada',
    position: at.position,
    timeZoneId: at.timeZoneId,
    sharesStatus: true,
    isViewer: true,
    weather: {
      temperatureC: city === 'Milan' ? 13 : 7,
      condition: city === 'Milan' ? 'fog' : 'cloudy',
      observedAt: '2025-10-27T14:00:00Z',
    },
    weatherState: 'Available',
  };
}

/** What GET /api/teams/{id}/me answers Sofia: her own pin in Milan, her country and her own postal code. */
export const SOFIA_PROFILE: Answer = {
  json: { teamName: 'Northwind', pin: ownPin('Milan'), countryCode: 'IT', postalCode: '20121' },
};

/** What a save of Canada and M5V 2T6 answers: her pin in Toronto. */
export const SOFIA_IN_TORONTO: Answer = {
  json: { teamName: 'Northwind', pin: ownPin('Toronto'), countryCode: 'CA', postalCode: 'M5V 2T6' },
};

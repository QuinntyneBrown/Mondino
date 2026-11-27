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

/** A teammate's own settings, as GET and PUT /me carry them (ADR 0023). */
export interface SettingsJson {
  temperatureUnit: 'celsius' | 'fahrenheit';
  clockFormat: '24-hour' | '12-hour';
  momentKinds: string[];
  sharesWeather: boolean;
  sharesStatus: boolean;
}

/** Sofia's settings as her country gives them: °C, the 24-hour clock, every kind, both switches on. */
export const SOFIA_SETTINGS: SettingsJson = {
  temperatureUnit: 'celsius',
  clockFormat: '24-hour',
  momentKinds: ['holiday', 'formula-1', 'local-event', 'sport'],
  sharesWeather: true,
  sharesStatus: true,
};

/** What GET /api/teams/{id}/me answers Sofia in Milan, with her settings changed as `change` says. */
export function sofiaProfile(change: Partial<SettingsJson> = {}): Answer {
  return {
    json: {
      teamName: 'Northwind',
      pin: ownPin('Milan'),
      countryCode: 'IT',
      postalCode: '20121',
      settings: { ...SOFIA_SETTINGS, ...change },
    },
  };
}

/** What GET /api/teams/{id}/me answers Sofia: her own pin in Milan, her country, her own postal code and her settings. */
export const SOFIA_PROFILE: Answer = sofiaProfile();

/** What a save of Canada and M5V 2T6 answers: her pin in Toronto. */
export const SOFIA_IN_TORONTO: Answer = {
  json: {
    teamName: 'Northwind',
    pin: ownPin('Toronto'),
    countryCode: 'CA',
    postalCode: 'M5V 2T6',
    settings: SOFIA_SETTINGS,
  },
};

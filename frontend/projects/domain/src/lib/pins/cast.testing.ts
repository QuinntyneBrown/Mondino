import type { Pin } from '@mondino/api';

/** A pin for a unit test: only what the rule reads is given. */
export const pin = (
  name: string,
  timeZoneId: string,
  longitude: number,
  more: Partial<Pin> = {},
): Pin => ({
  teammateId: name,
  name,
  colour: 'teammate-1',
  cityName: name,
  country: '',
  position: { latitude: 0, longitude },
  timeZoneId,
  sharesStatus: true,
  isViewer: false,
  weather: null,
  weatherState: 'Unavailable',
  ...more,
});

/** The cast at the mocks' "now" (docs/mocks/README.md). */
export const cast: Pin[] = [
  pin('Tomás Herrera', 'America/Mexico_City', -99.13),
  pin('Jordan Lee', 'America/Chicago', -97.74),
  pin('Chloé Martin', 'America/Sao_Paulo', -46.63),
  pin('Liam O’Connor', 'Europe/Dublin', -6.26),
  pin('Kwame Mensah', 'Africa/Accra', -0.19),
  pin('Luca Ferri', 'Europe/Rome', 9.19),
  pin('Sofia Bianchi', 'Europe/Rome', 9.19, { isViewer: true }),
  pin('Lena Fischer', 'Europe/Berlin', 13.4),
  pin('Mara Lindqvist', 'Europe/Stockholm', 18.07),
  pin('Ahmed Al-Sayed', 'Asia/Dubai', 55.27),
  pin('Priya Raman', 'Asia/Kolkata', 77.59),
  pin('Aiko Tanaka', 'Asia/Tokyo', 139.69),
  pin('Noah Williams', 'Australia/Melbourne', 144.96),
];

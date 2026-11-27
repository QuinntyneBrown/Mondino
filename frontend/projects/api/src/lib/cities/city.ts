import type { Position } from '../globe/position';

/** A city: where a pin is placed, at the city's own position, never a postal code's. */
export interface City {
  readonly name: string;
  readonly region: string;
  /** ISO 3166-1 alpha-2: "IT". */
  readonly countryCode: string;
  readonly position: Position;
  /** The IANA time zone: "Europe/Rome". */
  readonly timeZoneId: string;
}

/** What a postal code lookup found: the city, and the weather there (journey 13), or null. */
export interface PostalCodeResult {
  readonly city: City;
  readonly weather: null;
}

/** A city to choose in "Your city". */
export interface CityResult {
  readonly cityId: string;
  readonly city: City;
}

/**
 * Where a postal code lookup stands. The postal code is kept only as typed, for the words of the
 * screen; it is never stored.
 */
export type LookupState =
  | { readonly kind: 'Idle' }
  | { readonly kind: 'Locating'; readonly postalCode: string }
  | { readonly kind: 'Found'; readonly result: PostalCodeResult }
  | { readonly kind: 'NotFound'; readonly postalCode: string }
  | { readonly kind: 'Unavailable' }
  | { readonly kind: 'RateLimited'; readonly retryAt: number };

import type { ClockFormat } from '@mondino/api';

/**
 * The clock a teammate reads times on until they choose one (L2-033): the 12-hour clock in the
 * United States and Canada, the 24-hour clock elsewhere. Profile & Settings stores a choice with
 * journey 23.
 */
export function defaultClockFormat(country: string): ClockFormat {
  return country === 'United States' || country === 'Canada' ? '12-hour' : '24-hour';
}

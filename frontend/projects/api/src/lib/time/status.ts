/** Where a teammate is in their day, from their local hour alone (L2-015). */
export type Status = 'early-morning' | 'working-hours' | 'evening' | 'probably-asleep';

/** How the viewer reads a time: "08:05" or "8:05 am" (L2-014, L2-033). */
export type ClockFormat = '24-hour' | '12-hour';

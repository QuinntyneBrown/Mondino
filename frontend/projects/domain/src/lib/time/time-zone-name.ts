/**
 * The name of a time zone as a teammate reads it beside their local time, the same in summer and
 * winter: "Central European Time" for Europe/Rome, "Eastern Time" for America/Toronto (L2-031).
 * A zone the browser does not name is given by its id.
 */
export function timeZoneName(timeZoneId: string, now: number): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZoneId,
      timeZoneName: 'longGeneric',
    }).formatToParts(now);
    return parts.find((part) => part.type === 'timeZoneName')?.value ?? timeZoneId;
  } catch {
    return timeZoneId;
  }
}

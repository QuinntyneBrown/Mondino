/**
 * The working day, 09:00 to 18:00 local on every day of the week, in minutes from midnight. The
 * status ("Working hours") and the overlap read the same constants, so they cannot disagree.
 */
export const WorkingDay = { startMinute: 540, endMinute: 1080 } as const;

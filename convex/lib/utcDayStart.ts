/** UTC midnight for the calendar day containing `timestamp` (ms since epoch). */
export function getUtcDayStart(timestamp: number): number {
  const date = new Date(timestamp);
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
}

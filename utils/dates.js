// Small date helpers.
// The API returns dates as plain "YYYY-MM-DD" strings. We always work in UTC
// so the result does not depend on the time zone of the server.

export const WEEKDAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

const DAY_MS = 24 * 60 * 60 * 1000;

/** "2026-03-21" -> milliseconds at 00:00 UTC of that day. */
export function toUtcMs(isoDate) {
  const [year, month, day] = String(isoDate).split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

/** Today's date (00:00 UTC) based on the server's local calendar day. */
export function todayUtcMs(now = new Date()) {
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Whole days between two UTC timestamps (negative if `toMs` is earlier). */
export function daysBetween(fromMs, toMs) {
  return Math.round((toMs - fromMs) / DAY_MS);
}

const longFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
});
const shortFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric', month: 'short', timeZone: 'UTC',
});

/** "2026-03-21" -> "21 March 2026" */
export function formatDate(isoDate) {
  return longFormat.format(new Date(toUtcMs(isoDate)));
}

/** "2026-03-21" -> "21 Mar" */
export function formatShortDate(isoDate) {
  return shortFormat.format(new Date(toUtcMs(isoDate)));
}

/** ("2026-03-21", "2026-03-23") -> "21 Mar – 23 March 2026" */
export function formatRange(startIso, endIso) {
  return `${formatShortDate(startIso)} – ${formatDate(endIso)}`;
}

/** 0 -> "today", 1 -> "tomorrow", 12 -> "in 12 days", -3 -> "3 days ago" */
export function relativeDays(days) {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  return days > 0 ? `in ${days} days` : `${Math.abs(days)} days ago`;
}

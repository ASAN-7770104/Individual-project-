// Turns the raw API data into something useful for the views:
// filtering, sorting, extra fields and simple statistics.
// These are pure functions (no network, no Express), so they are easy to test.

import { WEEKDAYS, toUtcMs, todayUtcMs, daysBetween } from './dates.js';

/**
 * Adds the fields the view needs to one holiday object from the API.
 * @param {object} raw    Holiday from GET /PublicHolidays/{year}/{country}
 * @param {number} today  Today at 00:00 UTC (ms)
 */
export function enrichHoliday(raw, today) {
  const ms = toUtcMs(raw.date);
  const weekdayIndex = new Date(ms).getUTCDay();
  return {
    date: raw.date,
    name: raw.name,
    // The local name can be missing or identical to the English name.
    localName: raw.localName && raw.localName !== raw.name ? raw.localName : null,
    types: Array.isArray(raw.types) ? raw.types : [],
    // "global: false" means the holiday is only observed in some regions.
    nationwide: raw.global !== false,
    regions: Array.isArray(raw.counties) ? raw.counties : [],
    weekday: WEEKDAYS[weekdayIndex],
    isWeekend: weekdayIndex === 0 || weekdayIndex === 6,
    monthIndex: new Date(ms).getUTCMonth(),
    daysFromToday: daysBetween(today, ms),
  };
}

/**
 * Sorts, filters and summarises a list of holidays.
 * @param {object[]} rawHolidays  Array from the API
 * @param {{month?: number|null, type?: string|null}} filters  month is 1..12
 * @param {number} [today]        Injectable for tests
 */
export function buildHolidayView(rawHolidays, filters = {}, today = todayUtcMs()) {
  const all = rawHolidays
    .map((holiday) => enrichHoliday(holiday, today))
    .sort((a, b) => a.date.localeCompare(b.date));

  const filtered = all.filter((holiday) => {
    if (filters.month && holiday.monthIndex !== filters.month - 1) return false;
    if (filters.type && !holiday.types.includes(filters.type)) return false;
    return true;
  });

  // Holidays per month (index 0 = January) for the bar chart.
  const byMonth = Array(12).fill(0);
  filtered.forEach((holiday) => { byMonth[holiday.monthIndex] += 1; });

  const maxPerMonth = Math.max(...byMonth);
  const busiestMonth = maxPerMonth > 0 ? byMonth.indexOf(maxPerMonth) : null;

  return {
    holidays: filtered,
    total: filtered.length,
    totalUnfiltered: all.length,
    weekendCount: filtered.filter((holiday) => holiday.isWeekend).length,
    byMonth,
    maxPerMonth,
    busiestMonth,
    // The next holiday is searched in the whole year, ignoring the filters.
    next: all.find((holiday) => holiday.daysFromToday >= 0) || null,
  };
}

/**
 * Prepares the long-weekend list from GET /LongWeekend/{year}/{country}.
 * Returns the list plus the longest one.
 */
export function buildLongWeekends(rawList) {
  const list = rawList
    .map((item) => ({
      startDate: item.startDate,
      endDate: item.endDate,
      dayCount: item.dayCount,
      needBridgeDay: Boolean(item.needBridgeDay),
      bridgeDays: Array.isArray(item.bridgeDays) ? item.bridgeDays : [],
    }))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  const longest = list.reduce(
    (best, item) => (!best || item.dayCount > best.dayCount ? item : best),
    null,
  );

  return { list, longest };
}

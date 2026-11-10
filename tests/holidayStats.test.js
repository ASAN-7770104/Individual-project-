// Unit tests for the pure data-processing functions. Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';

import { buildHolidayView, buildLongWeekends } from '../utils/holidayStats.js';
import { formatDate, relativeDays, toUtcMs } from '../utils/dates.js';

// A fixed "today" so the tests give the same result every day.
const TODAY = toUtcMs('2026-03-01');

const sample = [
  { date: '2026-05-01', name: 'Labour Day', localName: 'Labour Day', global: true, types: ['Public'] },
  { date: '2026-01-01', name: "New Year's Day", localName: 'Жаңа жыл', global: true, types: ['Public'] },
  { date: '2026-03-08', name: "Women's Day", localName: null, global: true, types: ['Public'] }, // a Sunday
  { date: '2026-05-09', name: 'Victory Day', localName: 'Victory Day', global: false, counties: ['A'], types: ['Observance'] },
];

test('holidays are sorted by date', () => {
  const view = buildHolidayView(sample, {}, TODAY);
  assert.deepEqual(view.holidays.map((h) => h.date), ['2026-01-01', '2026-03-08', '2026-05-01', '2026-05-09']);
});

test('month and type filters work together', () => {
  assert.equal(buildHolidayView(sample, { month: 5 }, TODAY).total, 2);
  assert.equal(buildHolidayView(sample, { month: 5, type: 'Observance' }, TODAY).total, 1);
  assert.equal(buildHolidayView(sample, { type: 'Bank' }, TODAY).total, 0);
});

test('weekend holidays are counted and the busiest month is found', () => {
  const view = buildHolidayView(sample, {}, TODAY);
  // 2026-03-08 is a Sunday and 2026-05-09 is a Saturday.
  assert.equal(view.weekendCount, 2);
  assert.equal(view.busiestMonth, 4); // May (index 4) has 2 holidays
  assert.equal(view.byMonth[4], 2);
});

test('the next holiday ignores the past', () => {
  const view = buildHolidayView(sample, {}, TODAY);
  assert.equal(view.next.date, '2026-03-08');
  assert.equal(view.next.daysFromToday, 7);
});

test('missing local names become null and the API "global" flag is read', () => {
  const view = buildHolidayView(sample, {}, TODAY);
  const womens = view.holidays.find((h) => h.date === '2026-03-08');
  const victory = view.holidays.find((h) => h.date === '2026-05-09');
  assert.equal(womens.localName, null);
  assert.equal(victory.nationwide, false);
});

test('an empty list gives an empty, safe summary', () => {
  const view = buildHolidayView([], {}, TODAY);
  assert.equal(view.total, 0);
  assert.equal(view.busiestMonth, null);
  assert.equal(view.next, null);
});

test('the longest long weekend is selected', () => {
  const { list, longest } = buildLongWeekends([
    { startDate: '2026-05-01', endDate: '2026-05-03', dayCount: 3, needBridgeDay: false, bridgeDays: [] },
    { startDate: '2026-01-01', endDate: '2026-01-04', dayCount: 4, needBridgeDay: false, bridgeDays: [] },
  ]);
  assert.equal(list[0].startDate, '2026-01-01');
  assert.equal(longest.dayCount, 4);
});

test('date helpers format text as expected', () => {
  assert.equal(formatDate('2026-03-21'), '21 March 2026');
  assert.equal(relativeDays(0), 'today');
  assert.equal(relativeDays(1), 'tomorrow');
  assert.equal(relativeDays(12), 'in 12 days');
  assert.equal(relativeDays(-3), '3 days ago');
});

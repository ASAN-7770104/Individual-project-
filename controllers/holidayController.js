// Controller for the holidays result page.
// Used by both POST /holidays (form) and GET /holidays/:code/:year (shareable link).
import { getCountries, getPublicHolidays, getLongWeekends } from '../services/nagerService.js';
import { buildHolidayView, buildLongWeekends } from '../utils/holidayStats.js';
import { MIN_YEAR, MAX_YEAR, MONTHS, HOLIDAY_TYPES } from '../utils/constants.js';

export async function showHolidays(req, res, next) {
  try {
    // validateHolidayForm already cleaned the input and collected the errors.
    const errors = [...res.locals.formErrors];
    const { country, year, month, type } = req.holidayQuery;

    const countries = await getCountries(); // API request #1 (cached)
    const selected = countries.find((item) => item.countryCode === country);

    // Valid format, but is this country supported by the API?
    if (errors.length === 0 && !selected) {
      errors.push(`The country code "${country}" is not supported. Please choose a country from the list.`);
    }

    // Invalid input: show the form again with messages (no API call for holidays).
    if (errors.length > 0) {
      return res.status(400).render('index', {
        title: 'Find public holidays',
        active: 'home',
        countries,
        errors,
        values: res.locals.formValues,
        minYear: MIN_YEAR,
        maxYear: MAX_YEAR,
        months: MONTHS,
        types: HOLIDAY_TYPES,
      });
    }

    // API requests #2 and #3 run in parallel. Long weekends are a bonus: if only
    // that request fails, we still show the holidays.
    const [rawHolidays, rawLongWeekends] = await Promise.all([
      getPublicHolidays(year, country),
      getLongWeekends(year, country).catch((error) => {
        console.warn(`[holidayController] long weekends unavailable: ${error.message}`);
        return null;
      }),
    ]);

    const summary = buildHolidayView(rawHolidays, { month, type });
    const longWeekends = rawLongWeekends ? buildLongWeekends(rawLongWeekends) : null;

    return res.render('results', {
      title: `${selected.name} holidays ${year}`,
      active: 'home',
      countries,
      country: selected,
      year,
      filters: { month, type },
      summary,
      longWeekends,
      // Needed by the compact search form on the result page.
      errors: [],
      values: res.locals.formValues,
      minYear: MIN_YEAR,
      maxYear: MAX_YEAR,
      months: MONTHS,
      types: HOLIDAY_TYPES,
    });
  } catch (error) {
    return next(error);
  }
}

// Custom middleware #2: validates the search form BEFORE any API request is made.
// It works for both:
//   POST /holidays                 (data in req.body)
//   GET  /holidays/:code/:year     (data in req.params and req.query)
// It does not reject the request itself. It stores the cleaned values and the
// list of error messages, and the controller decides what to render.

import { MIN_YEAR, MAX_YEAR, HOLIDAY_TYPES } from '../utils/constants.js';

export default function validateHolidayForm(req, res, next) {
  const source = req.method === 'POST'
    ? req.body
    : { country: req.params.code, year: req.params.year, month: req.query.month, type: req.query.type };

  // Clean every value to a trimmed string first (the user can send anything).
  const country = String(source.country ?? '').trim().toUpperCase();
  const year = String(source.year ?? '').trim();
  const month = String(source.month ?? '').trim();
  const type = String(source.type ?? '').trim();

  const errors = [];

  if (!country) {
    errors.push('Please choose a country.');
  } else if (!/^[A-Z]{2}$/.test(country)) {
    errors.push('The country code must be two letters, for example KZ.');
  }

  if (!year) {
    errors.push('Please enter a year.');
  } else if (!/^\d{4}$/.test(year)) {
    errors.push('The year must be a 4-digit number, for example 2026.');
  } else if (Number(year) < MIN_YEAR || Number(year) > MAX_YEAR) {
    errors.push(`The year must be between ${MIN_YEAR} and ${MAX_YEAR}.`);
  }

  if (month && !(/^\d{1,2}$/.test(month) && Number(month) >= 1 && Number(month) <= 12)) {
    errors.push('The month must be a number from 1 to 12.');
  }

  if (type && !HOLIDAY_TYPES.includes(type)) {
    errors.push('The holiday type is not valid.');
  }

  // Values to put back into the form if something is wrong.
  res.locals.formValues = { country, year, month, type };
  res.locals.formErrors = errors;
  // Clean, typed values for the controller.
  req.holidayQuery = {
    country,
    year: Number(year),
    month: month ? Number(month) : null,
    type: type || null,
  };

  next();
}

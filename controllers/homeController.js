// Controller for the static-ish pages: home (search form) and about.
import { getCountries } from '../services/nagerService.js';
import { MIN_YEAR, MAX_YEAR, MONTHS, HOLIDAY_TYPES, DEFAULT_COUNTRY } from '../utils/constants.js';

/** GET / : shows the search form. */
export async function showHome(req, res, next) {
  try {
    const countries = await getCountries(); // API request #1 (cached)
    res.render('index', {
      title: 'Find public holidays',
      active: 'home',
      countries,
      errors: [],
      values: { country: DEFAULT_COUNTRY, year: new Date().getFullYear(), month: '', type: '' },
      minYear: MIN_YEAR,
      maxYear: MAX_YEAR,
      months: MONTHS,
      types: HOLIDAY_TYPES,
    });
  } catch (error) {
    next(error); // the central error handler shows the friendly page
  }
}

/** GET /about */
export function showAbout(req, res) {
  res.render('about', { title: 'About', active: 'about' });
}

// Controller for the country details page: GET /country/:code
import { getCountries, getCountryInfo, getNextHolidays } from '../services/nagerService.js';
import { enrichHoliday } from '../utils/holidayStats.js';
import { todayUtcMs } from '../utils/dates.js';
import AppError from '../utils/AppError.js';

export async function showCountry(req, res, next) {
  try {
    const code = String(req.params.code || '').trim().toUpperCase();

    // Validate the URL parameter before using it in an API request.
    if (!/^[A-Z]{2}$/.test(code)) {
      throw new AppError(400, 'The country code must be two letters, for example KZ.');
    }

    const countries = await getCountries(); // API request #1 (cached)
    if (!countries.some((item) => item.countryCode === code)) {
      throw new AppError(404, `The country "${code}" is not supported by the holiday service.`);
    }

    // API requests #4 and #5 in parallel.
    const [info, nextRaw] = await Promise.all([getCountryInfo(code), getNextHolidays(code)]);

    const today = todayUtcMs();
    const upcoming = nextRaw.slice(0, 6).map((holiday) => enrichHoliday(holiday, today));

    // Only link to neighbours that the API supports (otherwise the link would be a dead end).
    const supportedCodes = new Set(countries.map((item) => item.countryCode));
    const borders = (info.borders || []).map((border) => ({
      code: border.countryCode,
      name: border.commonName,
      supported: supportedCodes.has(border.countryCode),
    }));

    res.render('country', {
      title: info.commonName,
      active: '',
      info,
      borders,
      upcoming,
      year: new Date().getFullYear(),
    });
  } catch (error) {
    next(error);
  }
}

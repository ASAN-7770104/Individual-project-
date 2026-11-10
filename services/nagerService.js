// Service layer: the ONLY place that talks to the external API (Nager.Date).
// Controllers call these functions and never use Axios directly.
// Docs: https://date.nager.at/Api

import axios from 'axios';
import AppError from '../utils/AppError.js';

const client = axios.create({
  baseURL: process.env.NAGER_BASE_URL || 'https://date.nager.at/api/v3',
  // Without a timeout a slow API could keep a request hanging forever.
  timeout: Number(process.env.API_TIMEOUT_MS) || 8000,
  headers: { Accept: 'application/json' },
});

/**
 * Sends a GET request and converts every kind of failure into an AppError
 * with a friendly message. Technical details go to the console only.
 * @param {string} path   URL path, e.g. "/PublicHolidays/2026/KZ"
 * @param {string} what   Human description used in messages, e.g. "holidays for KZ in 2026"
 */
async function get(path, what) {
  try {
    const response = await client.get(path);
    // The API answers 204 (no body) when it has nothing to return.
    return response.status === 204 ? null : response.data;
  } catch (error) {
    if (!axios.isAxiosError(error)) throw error;

    // Log the technical details for the developer.
    console.error(
      `[nagerService] GET ${path} failed:`,
      error.code || '',
      error.response ? `HTTP ${error.response.status}` : error.message,
    );

    // Timeout
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      throw new AppError(504, 'The holiday service took too long to answer. Please try again in a moment.', { cause: error });
    }
    // No response at all: DNS problem, offline, connection refused...
    if (!error.response) {
      throw new AppError(503, 'The holiday service cannot be reached right now. Check your internet connection and try again.', { cause: error });
    }

    const status = error.response.status;
    if (status === 404) {
      throw new AppError(404, `No data was found for ${what}.`, { cause: error });
    }
    if (status === 400) {
      throw new AppError(400, `The holiday service did not accept the request for ${what}.`, { cause: error });
    }
    if (status === 429) {
      throw new AppError(429, 'Too many requests were sent to the holiday service. Please wait a minute and try again.', { cause: error });
    }
    // 5xx or anything unexpected
    throw new AppError(502, 'The holiday service had a problem. Please try again later.', { cause: error });
  }
}

// ---- Request 1: list of supported countries (cached for one hour) ----------
let countriesCache = { data: null, savedAt: 0 };
const COUNTRIES_TTL_MS = 60 * 60 * 1000;

/** @returns {Promise<{countryCode: string, name: string}[]>} sorted by name */
export async function getCountries() {
  const fresh = countriesCache.data && Date.now() - countriesCache.savedAt < COUNTRIES_TTL_MS;
  if (fresh) return countriesCache.data;

  try {
    const data = await get('/AvailableCountries', 'the list of countries');
    if (!Array.isArray(data) || data.length === 0) {
      throw new AppError(502, 'The holiday service returned an empty country list.');
    }
    const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name));
    countriesCache = { data: sorted, savedAt: Date.now() };
    return sorted;
  } catch (error) {
    // If the API is down but we still have an old copy, use it.
    if (countriesCache.data) return countriesCache.data;
    throw error;
  }
}

// ---- Request 2: public holidays of one country in one year ----------------
export async function getPublicHolidays(year, countryCode) {
  const data = await get(
    `/PublicHolidays/${year}/${encodeURIComponent(countryCode)}`,
    `${countryCode} in ${year}`,
  );
  return Array.isArray(data) ? data : [];
}

// ---- Request 3: long weekends of one country in one year ------------------
export async function getLongWeekends(year, countryCode) {
  const data = await get(
    `/LongWeekend/${year}/${encodeURIComponent(countryCode)}`,
    `long weekends of ${countryCode} in ${year}`,
  );
  return Array.isArray(data) ? data : [];
}

// ---- Request 4: details about a country (region, borders...) --------------
export async function getCountryInfo(countryCode) {
  const data = await get(`/CountryInfo/${encodeURIComponent(countryCode)}`, `country ${countryCode}`);
  if (!data) throw new AppError(404, `No data was found for country ${countryCode}.`);
  return data;
}

// ---- Request 5: upcoming public holidays of one country -------------------
export async function getNextHolidays(countryCode) {
  const data = await get(
    `/NextPublicHolidays/${encodeURIComponent(countryCode)}`,
    `upcoming holidays of ${countryCode}`,
  );
  return Array.isArray(data) ? data : [];
}

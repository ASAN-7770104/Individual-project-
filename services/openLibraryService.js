// Service layer: the ONLY place that talks to the external API (Open Library).
// Controllers call these functions and never use Axios directly.
// Docs: https://openlibrary.org/developers/api

import axios from 'axios';
import AppError from '../utils/AppError.js';
import { PAGE_SIZE } from '../utils/constants.js';

const client = axios.create({
  baseURL: process.env.OPENLIBRARY_BASE_URL || 'https://openlibrary.org',
  // Without a timeout a slow API could keep a request hanging forever.
  timeout: Number(process.env.API_TIMEOUT_MS) || 10000,
  headers: {
    Accept: 'application/json',
    // Open Library asks clients to say who they are.
    'User-Agent': 'BookFinder-StudentProject/1.0',
  },
});

// ---- A tiny in-memory cache (10 minutes) ------------------------------------
// The same book page or search is often opened twice; this saves API calls
// and makes those pages instant.
const cache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 200;

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (hit.expires < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return hit.data;
}

function cacheSet(key, data) {
  if (cache.size >= CACHE_MAX_ENTRIES) cache.delete(cache.keys().next().value); // drop the oldest
  cache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
}

const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

/**
 * Converts any Axios failure into an AppError with a friendly message.
 * Technical details go to the console only.
 */
function toAppError(error, path, what) {
  if (!axios.isAxiosError(error)) return error;

  console.error(
    `[openLibraryService] GET ${path} failed:`,
    error.code || '',
    error.response ? `HTTP ${error.response.status}` : error.message,
  );

  // Timeout
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return new AppError(504, 'Open Library took too long to answer. Please try again in a moment.', { cause: error });
  }
  // No response at all: DNS problem, offline, connection refused...
  if (!error.response) {
    return new AppError(503, 'Open Library cannot be reached right now. Check your internet connection and try again.', { cause: error });
  }

  const { status } = error.response;
  if (status === 404) return new AppError(404, `No data was found for ${what}.`, { cause: error });
  if (status === 429) return new AppError(429, 'Too many requests were sent to Open Library. Please wait a minute and try again.', { cause: error });
  if (status === 400 || status === 422) return new AppError(400, `Open Library did not accept the request for ${what}.`, { cause: error });
  // 5xx or anything unexpected
  return new AppError(502, 'Open Library had a problem. Please try again later.', { cause: error });
}

/**
 * Sends a GET request (with cache and one retry) and returns the JSON body.
 * @param {string} path    e.g. "/search.json"
 * @param {string} what    human description used in error messages
 * @param {object} params  query-string parameters
 */
async function get(path, what, params = {}) {
  const key = `${path}?${new URLSearchParams(params)}`;
  const cached = cacheGet(key);
  if (cached !== undefined) return cached;

  let lastError;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await client.get(path, { params });
      cacheSet(key, response.data);
      return response.data;
    } catch (error) {
      lastError = error;
      // Retry once, but only for problems that may disappear by themselves.
      const retryable = axios.isAxiosError(error) && (!error.response || error.response.status >= 500);
      if (!retryable || attempt === 2) break;
      console.warn(`[openLibraryService] retrying GET ${path} ...`);
      await wait(500);
    }
  }
  throw toAppError(lastError, path, what);
}

// ---- Request 1: search books ------------------------------------------------
const SEARCH_FIELDS = 'key,title,author_name,author_key,first_publish_year,cover_i,edition_count';

/**
 * @param {{q: string, mode: 'all'|'title'|'author'|'subject', sort: string, page: number}} query
 * @returns {Promise<{numFound: number, docs: object[]}>}
 */
export async function searchBooks({ q, mode, sort, page }) {
  const params = { fields: SEARCH_FIELDS, limit: PAGE_SIZE, page };
  // mode "all" uses q=..., the others use title=... / author=... / subject=...
  if (mode === 'all') params.q = q;
  else params[mode] = q;
  if (sort === 'new' || sort === 'old') params.sort = sort;

  const data = await get('/search.json', `books matching "${q}"`, params);
  if (!data || !Array.isArray(data.docs)) {
    throw new AppError(502, 'Open Library returned an unexpected answer. Please try again.');
  }
  return { numFound: Number(data.numFound) || 0, docs: data.docs };
}

// ---- Request 2: details of one book (a "work") ------------------------------
export async function getWork(id) {
  let data = await get(`/works/${id}.json`, `the book ${id}`);

  // Merged duplicates answer with {type: "/type/redirect", location: "/works/OL...W"}.
  if (data && data.type && data.type.key === '/type/redirect') {
    if (!/^\/works\/OL\d{1,12}W$/.test(String(data.location))) {
      throw new AppError(502, 'Open Library returned an unexpected answer. Please try again.');
    }
    data = await get(`${data.location}.json`, `the book ${id}`);
  }

  if (!data || !data.title || !data.key) throw new AppError(404, `No data was found for the book ${id}.`);
  return data;
}

// ---- Request 3: rating summary of one book ----------------------------------
/** @returns {Promise<{average: number, count: number, counts: object}|null>} */
export async function getWorkRatings(id) {
  const data = await get(`/works/${id}/ratings.json`, `ratings of the book ${id}`);
  if (!data || !data.summary) return null;
  return { average: data.summary.average, count: data.summary.count || 0, counts: data.counts || {} };
}

// ---- Request 4: one author ---------------------------------------------------
export async function getAuthor(id) {
  const data = await get(`/authors/${id}.json`, `the author ${id}`);
  if (!data || !data.name) throw new AppError(404, `No data was found for the author ${id}.`);
  return data;
}

// ---- Request 5: books of one author ------------------------------------------
export async function getAuthorWorks(id, { limit = PAGE_SIZE, offset = 0 } = {}) {
  const data = await get(`/authors/${id}/works.json`, `books of the author ${id}`, { limit, offset });
  return { size: Number(data && data.size) || 0, entries: Array.isArray(data && data.entries) ? data.entries : [] };
}

// ---- Request 6: books of one subject ------------------------------------------
export async function getSubject(slug, { limit = PAGE_SIZE, offset = 0 } = {}) {
  const data = await get(`/subjects/${slug}.json`, `the subject "${slug}"`, { limit, offset });
  return {
    name: (data && data.name) || slug.replace(/_/g, ' '),
    workCount: Number(data && data.work_count) || 0,
    works: Array.isArray(data && data.works) ? data.works : [],
  };
}

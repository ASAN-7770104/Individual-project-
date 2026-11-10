// Custom middleware #2: validates the search form BEFORE any API request is made.
// It works for both:
//   POST /search                    (data in req.body)
//   GET  /search?q=..&mode=..&page= (data in req.query: used by the pagination links)
// It does not reject the request itself. It stores the cleaned values and the
// list of error messages, and the controller decides what to render.

import { QUERY_MIN, QUERY_MAX, SEARCH_MODES, SORTS, MAX_PAGE } from '../utils/constants.js';

// Letters of any language, digits, spaces and a few punctuation marks used in book titles.
const ALLOWED_TEXT = /^[\p{L}\p{N}\s'’".,:;!?&()+#-]+$/u;

export default function validateSearchForm(req, res, next) {
  const source = req.method === 'POST' ? req.body : req.query;

  // Clean every value to a trimmed string first (the user can send anything).
  const q = String(source.q ?? '').replace(/\s+/g, ' ').trim();
  const mode = String(source.mode ?? '').trim() || 'all';
  const sort = String(source.sort ?? '').trim() || 'relevance';
  const pageText = req.method === 'POST' ? '1' : String(source.page ?? '1').trim() || '1';

  const errors = [];

  if (!q) {
    errors.push('Please enter a book title, an author or a subject.');
  } else if (q.length < QUERY_MIN || q.length > QUERY_MAX) {
    errors.push(`The search text must be between ${QUERY_MIN} and ${QUERY_MAX} characters.`);
  } else if (!ALLOWED_TEXT.test(q)) {
    errors.push('The search text contains characters that are not allowed. Use letters, numbers and simple punctuation.');
  }

  if (!SEARCH_MODES.some((item) => item.value === mode)) {
    errors.push('Please choose where to search: anything, title, author or subject.');
  }
  if (!SORTS.some((item) => item.value === sort)) {
    errors.push('The sort order is not valid.');
  }
  if (!/^\d{1,3}$/.test(pageText) || Number(pageText) < 1 || Number(pageText) > MAX_PAGE) {
    errors.push(`The page number must be between 1 and ${MAX_PAGE}.`);
  }

  // Values to put back into the form if something is wrong.
  res.locals.formValues = { q, mode, sort };
  res.locals.formErrors = errors;
  // Clean, typed values for the controller.
  req.searchQuery = { q, mode, sort, page: errors.length === 0 ? Number(pageText) : 1 };

  next();
}

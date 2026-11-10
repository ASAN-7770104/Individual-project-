// Custom middleware #3: validates an id taken from the URL (/book/:id, /author/:id,
// /subjects/:name) before it is used in an API request.
// Usage in a route: router.get('/book/:id', validateId('work'), showBook)
import AppError from '../utils/AppError.js';

const RULES = {
  // Open Library ids look like OL893414W (work) and OL79034A (author).
  work: { pattern: /^OL\d{1,12}W$/i, message: 'That is not a valid book id. Book ids look like OL893414W.' },
  author: { pattern: /^OL\d{1,12}A$/i, message: 'That is not a valid author id. Author ids look like OL79034A.' },
  subject: { pattern: /^[a-z0-9_-]{2,60}$/i, message: 'That is not a valid subject name. Use letters, numbers and underscores only.' },
};

/**
 * @param {'work'|'author'|'subject'} kind
 * @param {string} [param]  name of the route parameter
 */
export default function validateId(kind, param = 'id') {
  const { pattern, message } = RULES[kind];

  return function checkId(req, res, next) {
    const raw = String(req.params[param] ?? '').trim();
    if (!pattern.test(raw)) return next(new AppError(400, message));

    // Store the cleaned value: ids in upper case, subject slugs in lower case.
    req.cleanId = kind === 'subject' ? raw.toLowerCase() : raw.toUpperCase();
    return next();
  };
}

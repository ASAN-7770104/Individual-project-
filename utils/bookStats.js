// Turns the raw Open Library data into something useful for the views:
// clean book objects, statistics, a decade chart, pagination.
// These are pure functions (no network, no Express), so they are easy to test.

import { PAGE_SIZE, MAX_PAGE } from './constants.js';

// ---- Small helpers --------------------------------------------------------

/** Cover image URL, or null when the book has no (valid) cover id. size: S, M or L. */
export function coverUrl(id, size = 'M') {
  const number = Number(id);
  return Number.isInteger(number) && number > 0
    ? `https://covers.openlibrary.org/b/id/${number}-${size}.jpg`
    : null;
}

/** Author photo URL, or null. */
export function authorPhotoUrl(id) {
  const number = Number(id);
  return Number.isInteger(number) && number > 0
    ? `https://covers.openlibrary.org/a/id/${number}-M.jpg`
    : null;
}

/** Open Library text fields are either a string or {type, value}. Returns a plain string. */
export function textOf(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object' && typeof value.value === 'string') return value.value.trim();
  return '';
}

/**
 * Cleans a description / biography and splits it into paragraphs.
 * Removes the reference list Open Library often appends, Markdown links and
 * cuts very long texts.
 */
export function cleanDescription(value, maxLength = 1500) {
  let text = textOf(value);
  if (!text) return [];

  // Everything after a "----------" line or a "[1]: http..." reference is not the description.
  text = text.split(/\r?\n-{3,}|\r?\n\[\d+\]:/)[0];
  text = text
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '$1') // [text](url) -> text
    .replace(/\(\[source\]\[\d+\]\)/gi, '')
    .trim();

  if (text.length > maxLength) {
    text = `${text.slice(0, maxLength).replace(/\s+\S*$/, '')}…`;
  }

  return text
    .split(/(?:\r?\n){2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/** Finds a 4-digit year inside a text such as "March 1965" or "1965". */
export function yearFromText(value) {
  const match = String(value ?? '').match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
  return match ? Number(match[1]) : null;
}

/** "Fiction, science fiction, general" -> "fiction_science_fiction_general" (Open Library subject slug). */
export function slugify(name) {
  return String(name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/** 48273 -> "48,273" */
export function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-US');
}

/** Combines the parallel arrays author_name[] and author_key[] from a search result. */
function zipAuthors(names, keys) {
  if (!Array.isArray(names)) return [];
  return names.map((name, index) => ({
    name,
    id: Array.isArray(keys) && typeof keys[index] === 'string' ? keys[index] : null,
  }));
}

// ---- Normalizers: one shape for every kind of book list --------------------
// Every normalizer returns { id, title, authors: [{name, id}], year, cover, editions }

/** A book from GET /search.json */
export function normalizeSearchDoc(doc) {
  return {
    id: String(doc.key || '').replace('/works/', ''),
    title: doc.title || 'Untitled',
    authors: zipAuthors(doc.author_name, doc.author_key),
    year: Number.isInteger(doc.first_publish_year) ? doc.first_publish_year : null,
    cover: coverUrl(doc.cover_i),
    editions: Number(doc.edition_count) || 0,
  };
}

/** A book from GET /subjects/{slug}.json */
export function normalizeSubjectWork(work) {
  return {
    id: String(work.key || '').replace('/works/', ''),
    title: work.title || 'Untitled',
    authors: (Array.isArray(work.authors) ? work.authors : []).map((author) => ({
      name: author.name,
      id: typeof author.key === 'string' ? author.key.replace('/authors/', '') : null,
    })),
    year: Number.isInteger(work.first_publish_year) ? work.first_publish_year : null,
    cover: coverUrl(work.cover_id),
    editions: Number(work.edition_count) || 0,
  };
}

/** A book from GET /authors/{id}/works.json */
export function normalizeAuthorWork(entry) {
  return {
    id: String(entry.key || '').replace('/works/', ''),
    title: entry.title || 'Untitled',
    authors: [],
    year: yearFromText(entry.first_publish_date),
    cover: coverUrl(Array.isArray(entry.covers) ? entry.covers.find((id) => id > 0) : null),
    editions: 0,
  };
}

// ---- Statistics for the search results page ---------------------------------

/** Number of books per decade: [{label: "1960s", count, percent}] sorted by decade. */
export function buildDecadeChart(books) {
  const counts = new Map();
  books.forEach((book) => {
    if (!Number.isInteger(book.year)) return;
    const decade = Math.floor(book.year / 10) * 10;
    counts.set(decade, (counts.get(decade) || 0) + 1);
  });

  const biggest = Math.max(0, ...counts.values());
  return [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([decade, count]) => ({
      label: `${decade}s`,
      count,
      percent: biggest ? Math.round((count / biggest) * 100) : 0,
    }));
}

/** The authors that appear most often in the list. */
export function buildTopAuthors(books, limit = 5) {
  const counts = new Map();
  books.forEach((book) => {
    book.authors.forEach((author) => {
      if (!author.name) return;
      const entry = counts.get(author.name) || { name: author.name, id: author.id, count: 0 };
      entry.count += 1;
      counts.set(author.name, entry);
    });
  });
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}

/** Total number of pages (never more than MAX_PAGE). */
export function countPages(total, pageSize = PAGE_SIZE) {
  return Math.min(Math.ceil(total / pageSize), MAX_PAGE);
}

/**
 * Prepares everything the results page needs from one Open Library search answer.
 * @param {{numFound: number, docs: object[]}} result
 * @param {number} page  current page (1-based)
 */
export function buildSearchView(result, page) {
  const books = result.docs.map(normalizeSearchDoc).filter((book) => book.id);
  const years = books.map((book) => book.year).filter(Number.isInteger);

  // The book with the most editions (only if at least one edition is known).
  const mostEditions = books.reduce(
    (best, book) => (book.editions > (best ? best.editions : 0) ? book : best),
    null,
  );

  const totalPages = countPages(result.numFound);
  const offset = (page - 1) * PAGE_SIZE;

  return {
    books,
    total: result.numFound,
    shown: books.length,
    from: books.length ? offset + 1 : 0,
    to: books.length ? offset + books.length : 0,
    oldest: years.length ? Math.min(...years) : null,
    newest: years.length ? Math.max(...years) : null,
    withoutYear: books.length - years.length,
    mostEditions,
    decades: buildDecadeChart(books),
    topAuthors: buildTopAuthors(books),
    page,
    totalPages,
    hasPrev: page > 1,
    hasNext: page < totalPages,
  };
}

/** Validates ?page= . Returns the page number, or null if it is not valid. */
export function parsePage(value) {
  if (value === undefined || value === null || value === '') return 1;
  const text = String(value).trim();
  if (!/^\d{1,3}$/.test(text)) return null;
  const page = Number(text);
  return page >= 1 && page <= MAX_PAGE ? page : null;
}

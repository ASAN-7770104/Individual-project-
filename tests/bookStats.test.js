// Unit tests for the pure data-processing functions. Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  coverUrl, textOf, cleanDescription, yearFromText, slugify, formatNumber,
  normalizeSearchDoc, normalizeSubjectWork, normalizeAuthorWork,
  buildDecadeChart, buildTopAuthors, buildSearchView, parsePage,
} from '../utils/bookStats.js';

// A small fake Open Library search answer.
const docs = [
  { key: '/works/OL1W', title: 'Dune', author_name: ['Frank Herbert'], author_key: ['OL79034A'], first_publish_year: 1965, cover_i: 111, edition_count: 155 },
  { key: '/works/OL2W', title: 'Dune Messiah', author_name: ['Frank Herbert'], author_key: ['OL79034A'], first_publish_year: 1969, edition_count: 40 },
  { key: '/works/OL3W', title: 'Neuromancer', author_name: ['William Gibson'], first_publish_year: 1984, cover_i: -1, edition_count: 90 },
  { key: '/works/OL4W', title: 'No year book' },
];

test('cover and photo urls are built only for valid ids', () => {
  assert.equal(coverUrl(111), 'https://covers.openlibrary.org/b/id/111-M.jpg');
  assert.equal(coverUrl(111, 'L'), 'https://covers.openlibrary.org/b/id/111-L.jpg');
  assert.equal(coverUrl(-1), null);
  assert.equal(coverUrl(undefined), null);
});

test('textOf accepts a string or a {type, value} object', () => {
  assert.equal(textOf('  hello '), 'hello');
  assert.equal(textOf({ type: '/type/text', value: 'from object' }), 'from object');
  assert.equal(textOf(null), '');
  assert.equal(textOf(42), '');
});

test('cleanDescription removes references, markdown links and splits paragraphs', () => {
  const raw = 'First paragraph with a [link](https://example.com).\n\nSecond paragraph.\n\n----------\nContributors include: someone\n[1]: http://x';
  assert.deepEqual(cleanDescription(raw), ['First paragraph with a link.', 'Second paragraph.']);
  assert.deepEqual(cleanDescription(undefined), []);
  assert.deepEqual(cleanDescription({ value: 'Object text' }), ['Object text']);
});

test('cleanDescription shortens very long text', () => {
  const long = 'word '.repeat(1000);
  const [paragraph] = cleanDescription(long, 100);
  assert.ok(paragraph.length <= 101);
  assert.ok(paragraph.endsWith('…'));
});

test('small helpers: year, slug and number formatting', () => {
  assert.equal(yearFromText('March 1965'), 1965);
  assert.equal(yearFromText('unknown'), null);
  assert.equal(slugify('Fiction, science fiction, general'), 'fiction_science_fiction_general');
  assert.equal(slugify('  !!! '), '');
  assert.equal(formatNumber(48273), '48,273');
});

test('search documents are normalised (authors zipped, invalid cover dropped)', () => {
  const book = normalizeSearchDoc(docs[0]);
  assert.equal(book.id, 'OL1W');
  assert.deepEqual(book.authors, [{ name: 'Frank Herbert', id: 'OL79034A' }]);
  assert.equal(book.year, 1965);
  assert.equal(normalizeSearchDoc(docs[2]).cover, null);
  // Missing fields give safe defaults instead of crashing.
  const empty = normalizeSearchDoc(docs[3]);
  assert.deepEqual(empty.authors, []);
  assert.equal(empty.year, null);
  assert.equal(empty.editions, 0);
});

test('subject and author-work entries are normalised to the same shape', () => {
  const fromSubject = normalizeSubjectWork({
    key: '/works/OL9W', title: 'Alice', cover_id: 5, edition_count: 3,
    first_publish_year: 1865, authors: [{ name: 'Lewis Carroll', key: '/authors/OL1A' }],
  });
  assert.deepEqual(fromSubject.authors, [{ name: 'Lewis Carroll', id: 'OL1A' }]);
  assert.equal(fromSubject.cover, 'https://covers.openlibrary.org/b/id/5-M.jpg');

  const fromAuthor = normalizeAuthorWork({ key: '/works/OL7W', title: 'Book', covers: [-1, 8], first_publish_date: 'May 1999' });
  assert.equal(fromAuthor.year, 1999);
  assert.equal(fromAuthor.cover, 'https://covers.openlibrary.org/b/id/8-M.jpg');
});

test('decade chart groups books and scales the bars', () => {
  const books = docs.map(normalizeSearchDoc);
  const chart = buildDecadeChart(books);
  assert.deepEqual(chart.map((row) => row.label), ['1960s', '1980s']);
  assert.equal(chart[0].count, 2);
  assert.equal(chart[0].percent, 100);
  assert.equal(chart[1].percent, 50);
  assert.deepEqual(buildDecadeChart([]), []);
});

test('top authors are counted and sorted', () => {
  const top = buildTopAuthors(docs.map(normalizeSearchDoc));
  assert.equal(top[0].name, 'Frank Herbert');
  assert.equal(top[0].count, 2);
  assert.equal(top.length, 2);
});

test('search summary has totals, year range, most editions and pagination', () => {
  const view = buildSearchView({ numFound: 95, docs }, 2);
  assert.equal(view.total, 95);
  assert.equal(view.shown, 4);
  assert.equal(view.from, 21); // page 2 starts at result 21
  assert.equal(view.to, 24);
  assert.equal(view.oldest, 1965);
  assert.equal(view.newest, 1984);
  assert.equal(view.withoutYear, 1);
  assert.equal(view.mostEditions.title, 'Dune');
  assert.equal(view.totalPages, 5);
  assert.equal(view.page, 2);
});

test('an empty search gives a safe, empty summary', () => {
  const view = buildSearchView({ numFound: 0, docs: [] }, 1);
  assert.equal(view.total, 0);
  assert.equal(view.shown, 0);
  assert.equal(view.from, 0);
  assert.equal(view.oldest, null);
  assert.equal(view.mostEditions, null);
  assert.equal(view.totalPages, 0);
});

test('the page count never goes above the maximum', () => {
  assert.equal(buildSearchView({ numFound: 5_000_000, docs }, 1).totalPages, 50);
});

test('parsePage accepts 1-50 and rejects everything else', () => {
  assert.equal(parsePage(undefined), 1);
  assert.equal(parsePage('3'), 3);
  assert.equal(parsePage('50'), 50);
  assert.equal(parsePage('0'), null);
  assert.equal(parsePage('51'), null);
  assert.equal(parsePage('abc'), null);
  assert.equal(parsePage('2; DROP'), null);
});

// Tests for the two validation middlewares, using fake request/response objects.
import test from 'node:test';
import assert from 'node:assert/strict';

import validateSearchForm from '../middleware/validateSearchForm.js';
import validateId from '../middleware/validateId.js';
import AppError from '../utils/AppError.js';

/** Runs validateSearchForm and returns what it stored on req / res.locals. */
function runSearch(method, data) {
  const req = { method, body: method === 'POST' ? data : {}, query: method === 'GET' ? data : {} };
  const res = { locals: {} };
  let calledNext = false;
  validateSearchForm(req, res, () => { calledNext = true; });
  assert.equal(calledNext, true, 'next() must always be called');
  return { req, errors: res.locals.formErrors, values: res.locals.formValues };
}

test('a normal search is valid and gets default mode, sort and page', () => {
  const { req, errors } = runSearch('POST', { q: '  Dune  ' });
  assert.deepEqual(errors, []);
  assert.deepEqual(req.searchQuery, { q: 'Dune', mode: 'all', sort: 'relevance', page: 1 });
});

test('an empty search text is rejected', () => {
  const { errors } = runSearch('POST', { q: '   ' });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /enter a book title/i);
});

test('too short and too long search texts are rejected', () => {
  assert.equal(runSearch('POST', { q: 'a' }).errors.length, 1);
  assert.equal(runSearch('POST', { q: 'x'.repeat(101) }).errors.length, 1);
});

test('forbidden characters are rejected, other alphabets are fine', () => {
  assert.equal(runSearch('POST', { q: '<script>alert(1)</script>' }).errors.length, 1);
  assert.deepEqual(runSearch('POST', { q: 'Абай жолы' }).errors, []);
  assert.deepEqual(runSearch('POST', { q: "Harry Potter & the Philosopher's Stone" }).errors, []);
});

test('unknown mode and sort values are rejected', () => {
  const { errors } = runSearch('POST', { q: 'dune', mode: 'isbn', sort: 'random' });
  assert.equal(errors.length, 2);
});

test('the page number is read from the query string on GET and checked', () => {
  assert.equal(runSearch('GET', { q: 'dune', page: '3' }).req.searchQuery.page, 3);
  assert.equal(runSearch('GET', { q: 'dune', page: '0' }).errors.length, 1);
  assert.equal(runSearch('GET', { q: 'dune', page: '999' }).errors.length, 1);
  // On POST the page is always 1, whatever the user sends.
  assert.equal(runSearch('POST', { q: 'dune', page: '7' }).req.searchQuery.page, 1);
});

/** Runs validateId and returns the argument given to next(). */
function runId(kind, id, param = 'id') {
  const req = { params: { [param]: id } };
  let result = 'not called';
  validateId(kind, param)(req, {}, (arg) => { result = arg; });
  return { req, result };
}

test('valid ids pass and are normalised', () => {
  assert.equal(runId('work', 'ol893414w').req.cleanId, 'OL893414W');
  assert.equal(runId('author', 'OL79034A').req.cleanId, 'OL79034A');
  assert.equal(runId('subject', 'Science_Fiction', 'name').req.cleanId, 'science_fiction');
  assert.equal(runId('work', 'OL893414W').result, undefined);
});

test('invalid ids are sent to the error handler as a 400 AppError', () => {
  for (const [kind, id] of [['work', 'OL893414A'], ['work', '../etc/passwd'], ['author', 'abc'], ['subject', 'x']]) {
    const { result } = runId(kind, id, kind === 'subject' ? 'id' : 'id');
    assert.ok(result instanceof AppError, `${kind} ${id} should be rejected`);
    assert.equal(result.status, 400);
  }
});

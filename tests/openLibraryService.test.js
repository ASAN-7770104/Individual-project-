// Tests for the API service. They run against a tiny fake "Open Library" server started
// on a random local port, so they need no internet and are fast and repeatable.
// Run with: npm test
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import AppError from '../utils/AppError.js';

const hits = {};   // how many requests each path received
let server;
let service;

before(async () => {
  server = http.createServer((req, res) => {
    const { pathname } = new URL(req.url, 'http://localhost');
    hits[pathname] = (hits[pathname] || 0) + 1;
    const send = (status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    };

    switch (pathname) {
      case '/search.json': return send(200, { numFound: 1, docs: [{ key: '/works/OL1W', title: 'Dune' }] });
      case '/works/OL404W.json': return send(404, { error: 'notfound' });
      case '/works/OL429W.json': return send(429, {});
      case '/works/OL500W.json': return send(500, {});
      // A merged duplicate: the first answer only says where the real book is.
      case '/works/OL3W.json': return send(200, { type: { key: '/type/redirect' }, location: '/works/OL4W' });
      case '/works/OL4W.json': return send(200, { key: '/works/OL4W', title: 'Merged book' });
      // A redirect to somewhere that is not a book must be refused.
      case '/works/OL5W.json': return send(200, { type: { key: '/type/redirect' }, location: '/somewhere/else' });
      // Slower than the 150 ms timeout set below.
      case '/authors/OL9A.json': return setTimeout(() => send(200, { name: 'Too late' }), 600);
      default: return send(404, {});
    }
  });

  await new Promise((resolve) => { server.listen(0, '127.0.0.1', resolve); });

  // The service reads these variables when it is imported, so set them first.
  process.env.OPENLIBRARY_BASE_URL = `http://127.0.0.1:${server.address().port}`;
  process.env.API_TIMEOUT_MS = '150';
  service = await import('../services/openLibraryService.js');
});

after(() => {
  server.closeAllConnections();
  server.close();
});

test('searchBooks returns the number of results and the documents', async () => {
  const result = await service.searchBooks({ q: 'dune', mode: 'all', sort: 'relevance', page: 1 });
  assert.equal(result.numFound, 1);
  assert.equal(result.docs[0].title, 'Dune');
});

test('the same request is served from the cache the second time', async () => {
  await service.searchBooks({ q: 'dune', mode: 'all', sort: 'relevance', page: 1 });
  assert.equal(hits['/search.json'], 1, 'the API must be asked only once');
});

test('a 404 from the API becomes a friendly 404 AppError', async () => {
  await assert.rejects(service.getWork('OL404W'), (error) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.status, 404);
    assert.match(error.message, /OL404W/);
    return true;
  });
});

test('a 429 (rate limit) becomes a 429 AppError and is not retried', async () => {
  await assert.rejects(service.getWork('OL429W'), (error) => error instanceof AppError && error.status === 429);
  assert.equal(hits['/works/OL429W.json'], 1);
});

test('a 500 is retried once and then becomes a 502 AppError', async () => {
  await assert.rejects(service.getWork('OL500W'), (error) => error instanceof AppError && error.status === 502);
  assert.equal(hits['/works/OL500W.json'], 2, 'one request plus one retry');
});

test('a merged book follows the redirect to the real book', async () => {
  const work = await service.getWork('OL3W');
  assert.equal(work.title, 'Merged book');
});

test('a redirect to an unexpected place is refused', async () => {
  await assert.rejects(service.getWork('OL5W'), (error) => error instanceof AppError && error.status === 502);
});

test('a slow API gives a 504 timeout AppError', async () => {
  await assert.rejects(service.getAuthor('OL9A'), (error) => error instanceof AppError && error.status === 504);
});

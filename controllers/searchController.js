// Controller for the search results page.
// Used by both POST /search (form) and GET /search?q=... (pagination and shareable links).
import { searchBooks } from '../services/openLibraryService.js';
import { buildSearchView } from '../utils/bookStats.js';
import { searchFormData, buildPagination } from '../utils/viewData.js';
import { POPULAR_SUBJECTS, SEARCH_MODES, SORTS } from '../utils/constants.js';
import AppError from '../utils/AppError.js';

export async function showSearch(req, res, next) {
  try {
    // Someone opened /search without anything to search for: send them to the form.
    if (req.method === 'GET' && Object.keys(req.query).length === 0) return res.redirect('/');

    // validateSearchForm already cleaned the input and collected the errors.
    const errors = res.locals.formErrors;
    if (errors.length > 0) {
      // Invalid input: show the form again with messages (no API request is made).
      return res.status(400).render('index', {
        title: 'Find your next book',
        active: 'home',
        ...searchFormData(res.locals.formValues, errors),
        subjects: POPULAR_SUBJECTS.slice(0, 8),
      });
    }

    const { q, mode, sort, page } = req.searchQuery;
    const result = await searchBooks({ q, mode, sort, page }); // API request
    const summary = buildSearchView(result, page);

    // A page number beyond the last page (e.g. /search?q=dune&page=40 when there are 3 pages).
    if (summary.total > 0 && summary.shown === 0) {
      throw new AppError(404, 'That page of results does not exist. Go back to the first page.');
    }

    return res.render('results', {
      title: `Results for "${q}"`,
      active: 'home',
      ...searchFormData({ q, mode, sort }),
      query: { q, mode, sort },
      modeLabel: SEARCH_MODES.find((item) => item.value === mode).label,
      sortLabel: SORTS.find((item) => item.value === sort).label,
      summary,
      pagination: buildPagination('/search', { q, mode, sort }, page, summary.totalPages),
    });
  } catch (error) {
    return next(error);
  }
}

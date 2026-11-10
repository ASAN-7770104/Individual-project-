// Data shared by several pages: the search form and the pagination links.
import { SEARCH_MODES, SORTS, QUERY_MIN, QUERY_MAX } from './constants.js';

/**
 * Everything the search-form partial needs (home page, results page, validation errors).
 * @param {{q?: string, mode?: string, sort?: string}} [values]  what the form should show
 * @param {string[]} [errors]                                    messages shown above the form
 */
export function searchFormData(values = {}, errors = []) {
  return {
    errors,
    values: { q: values.q || '', mode: values.mode || 'all', sort: values.sort || 'relevance' },
    modes: SEARCH_MODES,
    sorts: SORTS,
    queryMin: QUERY_MIN,
    queryMax: QUERY_MAX,
  };
}

/**
 * Builds the "Previous / Next" links of a paginated page.
 * @param {string} basePath  e.g. "/search"
 * @param {object} params    query-string values to keep (q, mode, sort...)
 * @param {number} page      current page
 * @param {number} totalPages
 */
export function buildPagination(basePath, params, page, totalPages) {
  const link = (target) => `${basePath}?${new URLSearchParams({ ...params, page: String(target) })}`;
  return {
    page,
    totalPages,
    prevUrl: page > 1 ? link(page - 1) : null,
    nextUrl: page < totalPages ? link(page + 1) : null,
  };
}

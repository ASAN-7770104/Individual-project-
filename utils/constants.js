// Shared constants used by validation, controllers and views.

// How many results are shown on one page of search results.
export const PAGE_SIZE = 20;
// Open Library gets slow for very deep pages, so we stop at page 50 (1000 results).
export const MAX_PAGE = 50;

// Allowed length of the search text.
export const QUERY_MIN = 2;
export const QUERY_MAX = 100;

// "Search in" options. The value is also the name of the Open Library query
// parameter (title=..., author=..., subject=...), except "all" which uses q=...
export const SEARCH_MODES = [
  { value: 'all', label: 'Anything' },
  { value: 'title', label: 'Title' },
  { value: 'author', label: 'Author' },
  { value: 'subject', label: 'Subject' },
];

export const SORTS = [
  { value: 'relevance', label: 'Most relevant' },
  { value: 'new', label: 'Newest first' },
  { value: 'old', label: 'Oldest first' },
];

// Quick links shown on the home page and on the Subjects page.
// "slug" is the name Open Library uses in /subjects/{slug}.json
export const POPULAR_SUBJECTS = [
  { slug: 'science_fiction', label: 'Science fiction' },
  { slug: 'fantasy', label: 'Fantasy' },
  { slug: 'mystery_and_detective_stories', label: 'Mystery & detective' },
  { slug: 'romance', label: 'Romance' },
  { slug: 'horror', label: 'Horror' },
  { slug: 'history', label: 'History' },
  { slug: 'philosophy', label: 'Philosophy' },
  { slug: 'psychology', label: 'Psychology' },
  { slug: 'biography', label: 'Biography' },
  { slug: 'poetry', label: 'Poetry' },
  { slug: 'computer_science', label: 'Computer science' },
  { slug: 'art', label: 'Art' },
];

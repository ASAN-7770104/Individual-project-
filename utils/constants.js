// Shared constants used by validation, controllers and views.

// The Nager.Date API supports roughly this range of years.
export const MIN_YEAR = 1975;
export const MAX_YEAR = 2075;

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Holiday "types" returned by the API (used for the optional filter).
export const HOLIDAY_TYPES = ['Public', 'Bank', 'School', 'Authorities', 'Optional', 'Observance'];

// Country that is pre-selected in the form.
export const DEFAULT_COUNTRY = 'KZ';

// Controller for the pages that need no API request: home, subjects list, about.
import { POPULAR_SUBJECTS } from '../utils/constants.js';
import { searchFormData } from '../utils/viewData.js';

/** GET / : the search form and quick subject links. */
export function showHome(req, res) {
  res.render('index', {
    title: 'Find your next book',
    active: 'home',
    ...searchFormData(),
    subjects: POPULAR_SUBJECTS.slice(0, 8),
  });
}

/** GET /subjects : all quick subject links. */
export function showSubjects(req, res) {
  res.render('subjects', { title: 'Browse subjects', active: 'subjects', subjects: POPULAR_SUBJECTS });
}

/** GET /about */
export function showAbout(req, res) {
  res.render('about', { title: 'About', active: 'about' });
}

// Controller for the subject page: GET /subjects/:name
import { getSubject } from '../services/openLibraryService.js';
import {
  normalizeSubjectWork, buildTopAuthors, buildDecadeChart, countPages, parsePage,
} from '../utils/bookStats.js';
import { buildPagination } from '../utils/viewData.js';
import { PAGE_SIZE } from '../utils/constants.js';
import AppError from '../utils/AppError.js';

export async function showSubject(req, res, next) {
  try {
    const page = parsePage(req.query.page);
    if (page === null) throw new AppError(400, 'The page number is not valid.');

    // API request: one page of books about this subject.
    const subject = await getSubject(req.cleanId, { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });
    const books = subject.works.map(normalizeSubjectWork).filter((book) => book.id);

    const totalPages = countPages(subject.workCount);
    if (subject.workCount > 0 && books.length === 0) {
      throw new AppError(404, 'That page of books does not exist.');
    }

    // Open Library names are lower case ("science fiction"): capitalise the first letter for display.
    const displayName = subject.name.charAt(0).toUpperCase() + subject.name.slice(1);

    res.render('subject', {
      title: displayName,
      active: 'subjects',
      subject: { slug: req.cleanId, name: displayName, total: subject.workCount },
      books,
      topAuthors: buildTopAuthors(books, 5),
      decades: buildDecadeChart(books),
      pagination: buildPagination(`/subjects/${req.cleanId}`, {}, page, totalPages),
    });
  } catch (error) {
    next(error);
  }
}

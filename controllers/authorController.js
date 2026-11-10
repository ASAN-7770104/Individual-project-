// Controller for the author page: GET /author/:id
import { getAuthor, getAuthorWorks } from '../services/openLibraryService.js';
import {
  authorPhotoUrl, cleanDescription, normalizeAuthorWork, countPages, parsePage,
} from '../utils/bookStats.js';
import { buildPagination } from '../utils/viewData.js';
import { PAGE_SIZE } from '../utils/constants.js';
import AppError from '../utils/AppError.js';

export async function showAuthor(req, res, next) {
  try {
    const page = parsePage(req.query.page);
    if (page === null) throw new AppError(400, 'The page number is not valid.');

    // Two API requests in parallel: the author and a page of the author's books.
    const [author, works] = await Promise.all([
      getAuthor(req.cleanId),
      getAuthorWorks(req.cleanId, { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    ]);

    const totalPages = countPages(works.size);
    if (works.size > 0 && works.entries.length === 0) {
      throw new AppError(404, 'That page of books does not exist.');
    }

    res.render('author', {
      title: author.name,
      active: '',
      author: {
        id: req.cleanId,
        name: author.name,
        birth: author.birth_date || null,
        death: author.death_date || null,
        bio: cleanDescription(author.bio, 1200),
        photo: authorPhotoUrl((Array.isArray(author.photos) ? author.photos : []).find((id) => id > 0)),
        openLibraryUrl: `https://openlibrary.org/authors/${req.cleanId}`,
      },
      books: works.entries.map(normalizeAuthorWork).filter((book) => book.id),
      totalBooks: works.size,
      pagination: buildPagination(`/author/${req.cleanId}`, {}, page, totalPages),
    });
  } catch (error) {
    next(error);
  }
}

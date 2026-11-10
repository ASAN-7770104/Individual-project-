// Controller for the book details page: GET /book/:id
import { getWork, getWorkRatings, getAuthor } from '../services/openLibraryService.js';
import { coverUrl, cleanDescription, slugify } from '../utils/bookStats.js';

export async function showBook(req, res, next) {
  try {
    // API request: the book itself. If it does not exist, the service throws a 404 AppError.
    const work = await getWork(req.cleanId);
    const workId = work.key.replace('/works/', ''); // the real id (the requested one may have been merged)

    // The work only contains author ids, so we ask for the names (max 3 authors).
    const authorIds = (Array.isArray(work.authors) ? work.authors : [])
      .map((entry) => (entry && entry.author && entry.author.key ? entry.author.key.replace('/authors/', '') : ''))
      .filter((id) => /^OL\d{1,12}A$/.test(id))
      .slice(0, 3);

    // More API requests, in parallel. Authors and ratings are "extras": if one of
    // them fails we still show the book, so each failure is handled separately.
    const [authors, ratings] = await Promise.all([
      Promise.all(authorIds.map((id) => getAuthor(id)
        .then((author) => ({ id, name: author.name }))
        .catch(() => ({ id, name: 'Unknown author' })))),
      getWorkRatings(workId).catch((error) => {
        console.warn(`[bookController] ratings unavailable: ${error.message}`);
        return null;
      }),
    ]);

    const book = {
      id: workId,
      title: work.title,
      subtitle: work.subtitle || null,
      cover: coverUrl((Array.isArray(work.covers) ? work.covers : []).find((id) => id > 0), 'L'),
      description: cleanDescription(work.description),
      subjects: (Array.isArray(work.subjects) ? work.subjects : [])
        // Open Library also stores machine tags such as "nyt:mass-market=2021": hide them.
        .filter((name) => typeof name === 'string' && !/[:=]/.test(name))
        .slice(0, 14)
        .map((name) => ({ name, slug: slugify(name) })),
      links: (Array.isArray(work.links) ? work.links : [])
        .filter((link) => link && /^https?:\/\//.test(link.url))
        .slice(0, 5),
      firstPublished: work.first_publish_date || null,
      openLibraryUrl: `https://openlibrary.org/works/${workId}`,
    };

    // Rating bars: percent of each star level (5 stars first).
    let ratingBars = [];
    if (ratings && ratings.count > 0) {
      ratingBars = [5, 4, 3, 2, 1].map((stars) => {
        const count = Number(ratings.counts[stars]) || 0;
        return { stars, count, percent: Math.round((count / ratings.count) * 100) };
      });
    }

    res.render('book', { title: book.title, active: '', book, authors, ratings, ratingBars });
  } catch (error) {
    next(error);
  }
}

// Detail pages: one book, one author, one subject.
// validateId checks the id in the URL before the controller uses it in an API request.
import { Router } from 'express';
import validateId from '../middleware/validateId.js';
import { showBook } from '../controllers/bookController.js';
import { showAuthor } from '../controllers/authorController.js';
import { showSubject } from '../controllers/subjectController.js';

const router = Router();

router.get('/book/:id', validateId('work'), showBook);
router.get('/author/:id', validateId('author'), showAuthor);
router.get('/subjects/:name', validateId('subject', 'name'), showSubject);

export default router;

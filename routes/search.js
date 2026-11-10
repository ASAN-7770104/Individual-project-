import { Router } from 'express';
import validateSearchForm from '../middleware/validateSearchForm.js';
import { showSearch } from '../controllers/searchController.js';

const router = Router();

// Form submit: validate first, then the controller calls the API.
router.post('/search', validateSearchForm, showSearch);

// Same page as a link (used by "Previous / Next" and for sharing): /search?q=dune&mode=title&page=2
router.get('/search', validateSearchForm, showSearch);

export default router;

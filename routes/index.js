import { Router } from 'express';
import { showHome, showSubjects, showAbout } from '../controllers/homeController.js';

const router = Router();

router.get('/', showHome);
router.get('/subjects', showSubjects);
router.get('/about', showAbout);

export default router;

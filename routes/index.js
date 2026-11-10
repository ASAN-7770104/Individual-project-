import { Router } from 'express';
import { showHome, showAbout } from '../controllers/homeController.js';

const router = Router();

router.get('/', showHome);
router.get('/about', showAbout);

export default router;

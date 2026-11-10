import { Router } from 'express';
import { showCountry } from '../controllers/countryController.js';

const router = Router();

router.get('/country/:code', showCountry);

export default router;

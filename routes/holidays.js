import { Router } from 'express';
import validateHolidayForm from '../middleware/validateHolidayForm.js';
import { showHolidays } from '../controllers/holidayController.js';

const router = Router();

// Form submit: validate first, then the controller calls the API.
router.post('/holidays', validateHolidayForm, showHolidays);

// Shareable link to the same result page, e.g. /holidays/KZ/2026?month=5
router.get('/holidays/:code/:year', validateHolidayForm, showHolidays);

export default router;

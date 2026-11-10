// Entry point: creates the Express app, registers middleware and routes.
// "dotenv/config" must be the first import so .env is loaded before other
// modules read process.env.
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';

import requestLogger from './middleware/requestLogger.js';
import notFound from './middleware/notFound.js';
import errorHandler from './middleware/errorHandler.js';
import indexRoutes from './routes/index.js';
import holidayRoutes from './routes/holidays.js';
import countryRoutes from './routes/country.js';
import { formatDate, formatShortDate, formatRange, relativeDays } from './utils/dates.js';
import { MONTHS } from './utils/constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3000;

// --- View engine -----------------------------------------------------------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.disable('x-powered-by');

// Helpers available in every EJS template.
app.locals.formatDate = formatDate;
app.locals.formatShortDate = formatShortDate;
app.locals.formatRange = formatRange;
app.locals.relativeDays = relativeDays;
app.locals.MONTHS = MONTHS;

// --- Middleware (order matters!) ------------------------------------------
app.use(requestLogger);                                    // custom: logs every request
app.use(express.static(path.join(__dirname, 'public')));   // built-in: css, js, images
app.use(express.urlencoded({ extended: true }));           // built-in: HTML form data -> req.body
app.use(express.json());                                   // built-in: JSON bodies

// --- Routes ----------------------------------------------------------------
app.use('/', indexRoutes);
app.use('/', holidayRoutes);
app.use('/', countryRoutes);

// --- Errors (must come last) ------------------------------------------------
app.use(notFound);      // no route matched -> 404
app.use(errorHandler);  // every error ends here

// Safety net: log instead of crashing if something slips through.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

app.listen(PORT, () => {
  console.log(`Holiday Planner is running on http://localhost:${PORT}`);
});

export default app;

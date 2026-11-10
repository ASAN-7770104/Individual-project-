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
import searchRoutes from './routes/search.js';
import catalogRoutes from './routes/catalog.js';
import { formatNumber, slugify } from './utils/bookStats.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3000;

// --- View engine -----------------------------------------------------------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.disable('x-powered-by');

// Helpers available in every EJS template.
app.locals.formatNumber = formatNumber;
app.locals.slugify = slugify;

// --- Middleware (order matters!) ------------------------------------------
app.use(requestLogger);                                    // custom: logs every request
app.use(express.static(path.join(__dirname, 'public')));   // built-in: css, js, images
app.use(express.urlencoded({ extended: true }));           // built-in: HTML form data -> req.body
app.use(express.json());                                   // built-in: JSON bodies

// --- Routes ----------------------------------------------------------------
app.use('/', indexRoutes);
app.use('/', searchRoutes);
app.use('/', catalogRoutes);

// --- Errors (must come last) ------------------------------------------------
app.use(notFound);      // no route matched -> 404
app.use(errorHandler);  // every error ends here

// Safety net: log instead of crashing if something slips through.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

app.listen(PORT, () => {
  console.log(`Book Finder is running on http://localhost:${PORT}`);
});

export default app;

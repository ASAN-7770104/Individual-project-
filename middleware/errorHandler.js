// Centralized error handler. Express recognises it by its 4 arguments.
// Every error from controllers, services and middleware ends up here.
import AppError from '../utils/AppError.js';

// eslint-disable-next-line no-unused-vars
export default function errorHandler(err, req, res, next) {
  // If the response is already partly sent we can only hand it to Express.
  if (res.headersSent) return next(err);

  const known = err instanceof AppError;
  const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 600 ? err.status : 500;

  // Technical details go to the console, never to the user.
  // Expected problems (bad input, 404) get one short line; real bugs get the full stack.
  const expected = known && status < 500;
  console.error(
    `[${new Date().toISOString()}] ERROR ${req.method} ${req.originalUrl} -> ${status}:`,
    expected ? err.message : err.stack || err,
  );
  if (err.cause) console.error('  caused by:', err.cause.message);

  // Only our own AppError messages are safe to show.
  let message = 'Something went wrong on our side. Please try again later.';
  if (known) message = err.message;
  else if (status < 500) message = 'The request could not be processed.';

  const titles = { 404: 'Not found', 400: 'Bad request', 429: 'Too many requests' };
  return res.status(status).render('error', {
    title: titles[status] || 'Something went wrong',
    active: '',
    status,
    message,
  });
}

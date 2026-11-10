// 404 handler: runs only when no route matched. Must be registered AFTER all routes.
import AppError from '../utils/AppError.js';

export default function notFound(req, res, next) {
  next(new AppError(404, 'This page does not exist. Check the address or go back to the home page.'));
}

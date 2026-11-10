// An error whose message is safe to show to the user.
// Anything that is NOT an AppError is treated as an unexpected bug by the
// error handler and replaced by a generic message (no stack trace for users).
export default class AppError extends Error {
  /**
   * @param {number} status   HTTP status code to answer with (400, 404, 503...)
   * @param {string} message  Friendly text shown on the error page
   * @param {object} [options]
   * @param {Error}  [options.cause]  Original error, logged to the console only
   */
  constructor(status, message, options = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = 'AppError';
    this.status = status;
  }
}

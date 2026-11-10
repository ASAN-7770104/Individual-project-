// Custom middleware #1: logs every request (time, method, URL, status, duration).
export default function requestLogger(req, res, next) {
  const startedAt = Date.now();

  // "finish" fires when the response has been sent, so we know the status code.
  res.on('finish', () => {
    const duration = Date.now() - startedAt;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration} ms)`,
    );
  });

  next();
}

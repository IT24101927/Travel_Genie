const errorHandler = (err, req, res, next) => {
  // ── Clean terminal output ─────────────────────────────────────────────────
  const status = err.statusCode || err.status || 500;
  const route  = `${req.method} ${req.originalUrl}`;
  const label  = err.name || 'Error';

  if (status >= 500) {
    // Server / DB errors — always show these
    console.error(`\n  [ERROR] ${route}`);
    console.error(`  Type   : ${label}`);
    console.error(`  Msg    : ${err.message}`);
    if (err.original) console.error(`  DB     : ${err.original.message}`);
    if (process.env.NODE_ENV === 'development') console.error(err.stack);
    console.error('');
  } else if (status >= 400 && process.env.NODE_ENV === 'development') {
    // Client errors — only in dev
    console.warn(`  [WARN]  ${route} → ${status} ${err.message}`);
  }

  // ── Sequelize-specific mappings ───────────────────────────────────────────
  let message = err.message;

  if (err.name === 'SequelizeValidationError') {
    message = err.errors.map(e => e.message);
    status >= 500 || (err.statusCode = 400);
    return res.status(400).json({ success: false, error: message, message });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    const fields = err.fields ? Object.keys(err.fields) : [];
    const detail = err.original?.detail || err.parent?.detail || '';
    const constraint = err.original?.constraint || err.parent?.constraint || '';

    let message = 'Duplicate value — that record already exists.';
    if (fields.length === 1) {
      message = `${fields[0]} already exists.`;
    } else if (fields.length > 1) {
      message = `Duplicate combination for: ${fields.join(', ')}.`;
    } else if (detail) {
      message = detail;
    }

    return res.status(409).json({
      success: false,
      error: message,
      message,
      ...(constraint ? { constraint } : {}),
      ...(detail ? { detail } : {}),
    });
  }

  if (err.name === 'SequelizeDatabaseError') {
    const dbMessage = 'Invalid data — ' + (err.original?.message || err.message);
    return res.status(400).json({ success: false, error: dbMessage, message: dbMessage });
  }

  if (err.name === 'SequelizeConnectionError' || err.name === 'SequelizeConnectionRefusedError') {
    console.error('  [DB] Connection lost — check DATABASE_URL and Neon status.');
    return res.status(503).json({ success: false, error: 'Database unavailable. Please try again shortly.', message: 'Database unavailable. Please try again shortly.' });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError')  return res.status(401).json({ success: false, error: 'Invalid token', message: 'Invalid token' });
  if (err.name === 'TokenExpiredError')  return res.status(401).json({ success: false, error: 'Token expired', message: 'Token expired' });

  res.status(status).json({ success: false, error: message || 'Server Error', message: message || 'Server Error' });
};

module.exports = errorHandler;


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
    return res.status(400).json({ success: false, error: message });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({ success: false, error: 'Duplicate value — that record already exists.' });
  }

  if (err.name === 'SequelizeDatabaseError') {
    return res.status(400).json({ success: false, error: 'Invalid data — ' + (err.original?.message || err.message) });
  }

  if (err.name === 'SequelizeConnectionError' || err.name === 'SequelizeConnectionRefusedError') {
    console.error('  [DB] Connection lost — check DATABASE_URL and Neon status.');
    return res.status(503).json({ success: false, error: 'Database unavailable. Please try again shortly.' });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError')  return res.status(401).json({ success: false, error: 'Invalid token' });
  if (err.name === 'TokenExpiredError')  return res.status(401).json({ success: false, error: 'Token expired' });

  res.status(status).json({ success: false, error: message || 'Server Error' });
};

module.exports = errorHandler;


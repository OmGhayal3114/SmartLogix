const errorHandler = (err, req, res, next) => {
  console.error('[ERROR]', err.message);
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ error: messages.join('. ') });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ error: `An account with this ${field} already exists.` });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid ID format.' });
  }
  const status = err.statusCode || err.status || 500;
  const message = status === 500 ? 'Something went wrong. Please try again later.' : err.message;
  res.status(status).json({ error: message });
};

module.exports = errorHandler;

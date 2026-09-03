const express = require('express');
const router = express.Router();

// Serve the Maps API key to the frontend securely.
// The key is never hardcoded in any frontend file.
router.get('/maps-key', (req, res) => {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return res.status(503).json({ error: 'Maps API key not configured on server.' });
  }
  res.json({ key });
});

module.exports = router;

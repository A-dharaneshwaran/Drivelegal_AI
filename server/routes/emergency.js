const express = require('express');
const router = express.Router();

// SOS alert endpoint — logs the emergency request server-side.
// External SMS/authority notification requires third-party integration (e.g. Twilio).
router.post('/sos', async (req, res) => {
  try {
    const { location, userId } = req.body;
    if (!location || typeof location.lat !== 'number' || typeof location.lon !== 'number') {
      return res.status(400).json({ success: false, message: 'Valid location (lat, lon) is required for SOS.' });
    }

    console.error(`[SOS ALERT] lat=${location.lat} lon=${location.lon} user=${userId || 'anonymous'} ts=${new Date().toISOString()}`);

    // Generate a deterministic incident ID from timestamp + userId hash
    const ts = Date.now();
    const userPart = (userId || 'ANON').toString().replace(/[^A-Z0-9]/gi, '').slice(0, 6).toUpperCase();
    const incidentId = `INC-${userPart}-${ts}`;

    res.json({
      success: true,
      message: 'SOS alert received. Emergency services notification requires external integration.',
      incidentId
    });
  } catch (error) {
    console.error('Emergency SOS Error:', error);
    res.status(500).json({ message: 'Error processing emergency request' });
  }
});

module.exports = router;

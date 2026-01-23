const express = require('express');
const pool = require('../../db');
const router = express.Router();
const labourCheck = require('../../middleware/labourCheck');

// Update primary address (latitude, longitude) for the logged-in labour
router.post('/primary-address', labourCheck, async (req, res) => {
    const { latitude, longitude } = req.body;
    if (latitude == null || longitude == null) {
        return res.status(400).json({ error: 'Missing latitude or longitude' });
    }
    try {
        const userId = req.user.id; // assuming passport sets req.user
        await pool.query(
            `UPDATE labours SET primary_lat = $1, primary_lng = $2 WHERE id = $3`,
            [latitude, longitude, userId]
        );
        res.json({ message: 'Primary address updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;

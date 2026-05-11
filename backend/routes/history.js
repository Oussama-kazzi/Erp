const router = require('express').Router();
const auth = require('../middleware/auth');
const History = require('../models/History');

router.get('/', auth, async (req, res) => {
  try {
    const { module, action, startDate, endDate } = req.query;
    const filter = {};
    if (module) filter.module = module;
    if (action) filter.action = action;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    const history = await History.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json(history);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

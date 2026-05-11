const router = require('express').Router();
const auth = require('../middleware/auth');
const Worker = require('../models/Worker');
const logHistory = require('../utils/logHistory');

router.get('/', auth, async (req, res) => {
  try {
    const { status, name, startDate, endDate } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (name) filter.name = { $regex: name, $options: 'i' };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    const workers = await Worker.find(filter).sort({ createdAt: -1 });
    res.json(workers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const worker = new Worker(req.body);
    await worker.save();
    await logHistory({ action: 'created', module: 'worker', description: `Worker "${worker.name}" added`, user: req.user.name, referenceId: worker._id });
    res.status(201).json(worker);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) return res.status(404).json({ message: 'Worker not found' });
    Object.assign(worker, req.body);
    await worker.save();
    await logHistory({ action: 'updated', module: 'worker', description: `Worker "${worker.name}" updated`, user: req.user.name, referenceId: worker._id });
    res.json(worker);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/:id/pay', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    const worker = await Worker.findById(req.params.id);
    if (!worker) return res.status(404).json({ message: 'Worker not found' });
    worker.paidAmount += Number(amount);
    await worker.save();
    await logHistory({ action: 'payment', module: 'worker', description: `Worker "${worker.name}" paid ${amount}`, user: req.user.name, referenceId: worker._id });
    res.json(worker);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const worker = await Worker.findByIdAndDelete(req.params.id);
    if (!worker) return res.status(404).json({ message: 'Worker not found' });
    await logHistory({ action: 'deleted', module: 'worker', description: `Worker "${worker.name}" deleted`, user: req.user.name });
    res.json({ message: 'Worker deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

const router = require('express').Router();
const auth = require('../middleware/auth');
const Client = require('../models/Client');
const Order = require('../models/Order');
const logHistory = require('../utils/logHistory');

router.get('/', auth, async (req, res) => {
  try {
    const { search, page = 1, limit = 100 } = req.query;
    const filter = {};
    if (search) filter.fullName = { $regex: search, $options: 'i' };
    const skip = (Number(page) - 1) * Number(limit);
    const [clients, total] = await Promise.all([
      Client.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Client.countDocuments(filter),
    ]);
    res.json({ clients, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client not found' });
    const orders = await Order.find({ client: req.params.id }).sort({ createdAt: -1 });
    const totalPaid = orders.reduce((s, o) => s + o.advancePayment, 0);
    const totalRemaining = orders.reduce((s, o) => s + o.remainingAmount, 0);
    res.json({ client, orders, stats: { totalOrders: orders.length, totalPaid, totalRemaining } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const client = await Client.create(req.body);
    await logHistory({ action: 'created', module: 'client', description: `Client "${client.fullName}" added`, user: req.user.name, referenceId: client._id });
    res.status(201).json(client);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!client) return res.status(404).json({ message: 'Client not found' });
    await logHistory({ action: 'updated', module: 'client', description: `Client "${client.fullName}" updated`, user: req.user.name, referenceId: client._id });
    res.json(client);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client not found' });
    await logHistory({ action: 'deleted', module: 'client', description: `Client "${client.fullName}" removed`, user: req.user.name });
    res.json({ message: 'Client deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

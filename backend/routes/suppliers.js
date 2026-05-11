const router = require('express').Router();
const auth = require('../middleware/auth');
const Supplier = require('../models/Supplier');
const logHistory = require('../utils/logHistory');

router.get('/', auth, async (req, res) => {
  try {
    const { status, name } = req.query;
    const filter = {};
    if (status) filter.paymentStatus = status;
    if (name) filter.name = { $regex: name, $options: 'i' };
    const suppliers = await Supplier.find(filter).sort({ createdAt: -1 });
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const supplier = new Supplier(req.body);
    await supplier.save();
    await logHistory({ action: 'created', module: 'supplier', description: `Supplier "${supplier.name}" added`, user: req.user.name, referenceId: supplier._id });
    res.status(201).json(supplier);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    Object.assign(supplier, req.body);
    await supplier.save();
    await logHistory({ action: 'updated', module: 'supplier', description: `Supplier "${supplier.name}" updated`, user: req.user.name, referenceId: supplier._id });
    res.json(supplier);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/:id/pay', auth, async (req, res) => {
  try {
    const { amount, note } = req.body;
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    supplier.paidAmount += Number(amount);
    supplier.paymentHistory.push({ amount: Number(amount), note });
    await supplier.save();
    await logHistory({ action: 'payment', module: 'supplier', description: `Supplier "${supplier.name}" paid ${amount}`, user: req.user.name, referenceId: supplier._id });
    res.json(supplier);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndDelete(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    await logHistory({ action: 'deleted', module: 'supplier', description: `Supplier "${supplier.name}" deleted`, user: req.user.name });
    res.json({ message: 'Supplier deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

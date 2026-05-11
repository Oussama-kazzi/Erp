const router = require('express').Router();
const auth = require('../middleware/auth');
const Order = require('../models/Order');
const logHistory = require('../utils/logHistory');

router.get('/', auth, async (req, res) => {
  try {
    const { status, paymentStatus, client, startDate, endDate } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (client) filter.clientName = { $regex: client, $options: 'i' };
    if (startDate || endDate) {
      filter.orderDate = {};
      if (startDate) filter.orderDate.$gte = new Date(startDate);
      if (endDate) filter.orderDate.$lte = new Date(endDate);
    }
    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const order = new Order(req.body);
    await order.save();
    await logHistory({ action: 'created', module: 'order', description: `Order for "${order.clientName}" created`, user: req.user.name, referenceId: order._id });
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    Object.assign(order, req.body);
    await order.save();
    await logHistory({ action: 'updated', module: 'order', description: `Order for "${order.clientName}" updated`, user: req.user.name, referenceId: order._id });
    res.json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/:id/pay', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    order.advancePayment += Number(amount);
    await order.save();
    await logHistory({ action: 'payment', module: 'order', description: `Payment of ${amount} added for "${order.clientName}"`, user: req.user.name, referenceId: order._id });
    res.json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    await logHistory({ action: 'deleted', module: 'order', description: `Order for "${order.clientName}" deleted`, user: req.user.name });
    res.json({ message: 'Order deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

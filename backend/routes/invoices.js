const router = require('express').Router();
const auth = require('../middleware/auth');
const Invoice = require('../models/Invoice');
const logHistory = require('../utils/logHistory');

const genInvoiceNumber = async () => {
  const year = new Date().getFullYear();
  const count = await Invoice.countDocuments({ createdAt: { $gte: new Date(`${year}-01-01`) } });
  return `FAC-${year}-${String(count + 1).padStart(4, '0')}`;
};

router.get('/', auth, async (req, res) => {
  try {
    const { paymentStatus } = req.query;
    const filter = {};
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    const invoices = await Invoice.find(filter)
      .populate('client', 'fullName phone')
      .populate('relatedQuote', 'quoteNumber')
      .sort({ createdAt: -1 });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('client')
      .populate('relatedQuote', 'quoteNumber');
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const invoiceNumber = await genInvoiceNumber();
    const invoice = new Invoice({ ...req.body, invoiceNumber });
    await invoice.save();
    await invoice.populate('client', 'fullName phone');
    await logHistory({
      action: 'created', module: 'invoice',
      description: `Invoice ${invoiceNumber} created`,
      user: req.user.name, referenceId: invoice._id,
    });
    res.status(201).json(invoice);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    Object.assign(invoice, req.body);
    await invoice.save();
    await logHistory({
      action: 'updated', module: 'invoice',
      description: `Invoice ${invoice.invoiceNumber} updated`,
      user: req.user.name, referenceId: invoice._id,
    });
    res.json(invoice);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/:id/pay', auth, async (req, res) => {
  try {
    const { amount, note } = req.body;
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    invoice.paidAmount += Number(amount);
    invoice.paymentHistory.push({ amount: Number(amount), date: new Date(), note });
    await invoice.save();
    await logHistory({
      action: 'payment', module: 'invoice',
      description: `Payment of ${amount} MAD on invoice ${invoice.invoiceNumber}`,
      user: req.user.name, referenceId: invoice._id,
    });
    res.json(invoice);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    await logHistory({ action: 'deleted', module: 'invoice', description: `Invoice ${invoice.invoiceNumber} deleted`, user: req.user.name });
    res.json({ message: 'Invoice deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

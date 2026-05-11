const router = require('express').Router();
const auth = require('../middleware/auth');
const Quote = require('../models/Quote');
const Invoice = require('../models/Invoice');
const logHistory = require('../utils/logHistory');

const genQuoteNumber = async () => {
  const year = new Date().getFullYear();
  const count = await Quote.countDocuments({ createdAt: { $gte: new Date(`${year}-01-01`) } });
  return `DEV-${year}-${String(count + 1).padStart(4, '0')}`;
};

const genInvoiceNumber = async () => {
  const year = new Date().getFullYear();
  const count = await Invoice.countDocuments({ createdAt: { $gte: new Date(`${year}-01-01`) } });
  return `FAC-${year}-${String(count + 1).padStart(4, '0')}`;
};

router.get('/', auth, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const quotes = await Quote.find(filter)
      .populate('client', 'fullName phone')
      .sort({ createdAt: -1 });
    res.json(quotes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id).populate('client');
    if (!quote) return res.status(404).json({ message: 'Quote not found' });
    res.json(quote);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const quoteNumber = await genQuoteNumber();
    const quote = new Quote({ ...req.body, quoteNumber });
    await quote.save();
    await quote.populate('client', 'fullName phone');
    await logHistory({
      action: 'created', module: 'quote',
      description: `Quote ${quoteNumber} created for "${quote.client?.fullName}"`,
      user: req.user.name, referenceId: quote._id,
    });
    res.status(201).json(quote);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id);
    if (!quote) return res.status(404).json({ message: 'Quote not found' });
    const prevStatus = quote.status;
    Object.assign(quote, req.body);
    await quote.save();
    await quote.populate('client', 'fullName phone');
    const isRejection = req.body.status === 'rejected' && prevStatus !== 'rejected';
    await logHistory({
      action: isRejection ? 'rejected' : 'updated',
      module: 'quote',
      description: isRejection
        ? `Quote ${quote.quoteNumber} rejected for "${quote.client?.fullName}"`
        : `Quote ${quote.quoteNumber} updated`,
      user: req.user.name,
      referenceId: quote._id,
    });
    res.json(quote);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/:id/convert', auth, async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id).populate('client');
    if (!quote) return res.status(404).json({ message: 'Quote not found' });
    if (quote.status === 'converted') return res.status(400).json({ message: 'Already converted to invoice' });

    const invoiceNumber = await genInvoiceNumber();
    const invoice = await Invoice.create({
      invoiceNumber,
      client: quote.client._id,
      relatedQuote: quote._id,
      items: quote.items,
      laborCost: quote.laborCost,
      notes: quote.notes,
    });

    quote.status = 'converted';
    quote.convertedToInvoice = invoice._id;
    await quote.save();

    await logHistory({
      action: 'converted', module: 'quote',
      description: `Quote ${quote.quoteNumber} converted to invoice ${invoiceNumber}`,
      user: req.user.name, referenceId: quote._id,
    });
    res.json({ quote, invoice });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const quote = await Quote.findByIdAndDelete(req.params.id);
    if (!quote) return res.status(404).json({ message: 'Quote not found' });
    await logHistory({ action: 'deleted', module: 'quote', description: `Quote ${quote.quoteNumber} deleted`, user: req.user.name });
    res.json({ message: 'Quote deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

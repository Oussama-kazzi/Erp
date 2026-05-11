const router = require('express').Router();
const auth = require('../middleware/auth');
const StockMovement = require('../models/StockMovement');
const Product = require('../models/Product');
const logHistory = require('../utils/logHistory');

router.get('/', auth, async (req, res) => {
  try {
    const { productId } = req.query;
    const filter = {};
    if (productId) filter.product = productId;
    const movements = await StockMovement.find(filter)
      .populate('product', 'name category')
      .sort({ createdAt: -1 })
      .limit(200);
    res.json(movements);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { product: productId, type, quantity, reason, supplier } = req.body;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (type === 'OUT' && product.quantity < Number(quantity)) {
      return res.status(400).json({ message: `Insufficient stock. Available: ${product.quantity}` });
    }

    const movement = await StockMovement.create({
      product: productId, type, quantity, reason, supplier, createdBy: req.user.name,
    });

    product.quantity += type === 'IN' ? Number(quantity) : -Number(quantity);
    await product.save();

    await logHistory({
      action: type === 'IN' ? 'stock_in' : 'stock_out',
      module: 'product',
      description: `${type === 'IN' ? 'Added' : 'Removed'} ${quantity} units of "${product.name}"${reason ? ` — ${reason}` : ''}`,
      user: req.user.name,
      referenceId: product._id,
    });

    res.status(201).json({ movement, updatedQuantity: product.quantity });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;

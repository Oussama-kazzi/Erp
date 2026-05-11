const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const Product = require('../models/Product');
const logHistory = require('../utils/logHistory');

router.get('/', auth, async (req, res) => {
  try {
    const { status, category, supplier, name } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = { $regex: category, $options: 'i' };
    if (supplier) filter.supplier = { $regex: supplier, $options: 'i' };
    if (name) filter.name = { $regex: name, $options: 'i' };
    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) data.image = req.file.filename;
    const product = new Product(data);
    await product.save();
    await logHistory({ action: 'created', module: 'product', description: `Product "${product.name}" added to stock`, user: req.user.name, referenceId: product._id });
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', auth, upload.single('image'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (req.file) {
      // Delete old image file if it exists
      if (product.image) {
        const oldPath = path.join(__dirname, '../uploads', product.image);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      req.body.image = req.file.filename;
    }

    Object.assign(product, req.body);
    await product.save();
    await logHistory({ action: 'updated', module: 'product', description: `Product "${product.name}" updated`, user: req.user.name, referenceId: product._id });
    res.json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Delete image file
    if (product.image) {
      const imgPath = path.join(__dirname, '../uploads', product.image);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }

    await logHistory({ action: 'deleted', module: 'product', description: `Product "${product.name}" removed from stock`, user: req.user.name });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

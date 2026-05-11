const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String },
  supplier: { type: String },
  quantity: { type: Number, default: 0 },
  costPrice: { type: Number, default: 0 },
  sellingPrice: { type: Number, default: 0 },
  status: { type: String, enum: ['available', 'reserved', 'sold'], default: 'available' },
  image: { type: String, default: null },
  lowStockThreshold: { type: Number, default: 5 },
  notes: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);

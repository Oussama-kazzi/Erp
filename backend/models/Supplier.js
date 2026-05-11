const mongoose = require('mongoose');

const paymentHistorySchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  note: { type: String },
});

const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String },
  product: { type: String },
  category: { type: String },
  totalAmount: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  remainingAmount: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ['paid', 'partial', 'unpaid'], default: 'unpaid' },
  paymentHistory: [paymentHistorySchema],
  notes: { type: String },
}, { timestamps: true });

supplierSchema.pre('save', function (next) {
  this.remainingAmount = this.totalAmount - this.paidAmount;
  if (this.remainingAmount <= 0) this.paymentStatus = 'paid';
  else if (this.paidAmount > 0) this.paymentStatus = 'partial';
  else this.paymentStatus = 'unpaid';
  next();
});

module.exports = mongoose.model('Supplier', supplierSchema);

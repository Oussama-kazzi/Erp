const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity:    { type: Number, required: true },
  unitPrice:   { type: Number, required: true },
});

const paymentEntrySchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  date:   { type: Date, default: Date.now },
  note:   { type: String },
});

const invoiceSchema = new mongoose.Schema({
  invoiceNumber:  { type: String, unique: true },
  client:         { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  relatedQuote:   { type: mongoose.Schema.Types.ObjectId, ref: 'Quote' },
  relatedOrder:   { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  items:          [invoiceItemSchema],
  laborCost:      { type: Number, default: 0 },
  totalAmount:    { type: Number, default: 0 },
  paidAmount:     { type: Number, default: 0 },
  remainingAmount:{ type: Number, default: 0 },
  paymentStatus:  { type: String, enum: ['paid', 'partial', 'unpaid'], default: 'unpaid' },
  paymentHistory: [paymentEntrySchema],
  dueDate:        { type: Date },
  notes:          { type: String },
}, { timestamps: true });

invoiceSchema.pre('save', function (next) {
  this.totalAmount = this.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0) + (this.laborCost || 0);
  this.remainingAmount = this.totalAmount - this.paidAmount;
  if (this.remainingAmount <= 0)       this.paymentStatus = 'paid';
  else if (this.paidAmount > 0)        this.paymentStatus = 'partial';
  else                                 this.paymentStatus = 'unpaid';
  next();
});

module.exports = mongoose.model('Invoice', invoiceSchema);

const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  quantity:  { type: Number, required: true },
  unitPrice: { type: Number, required: true },
});

const orderSchema = new mongoose.Schema({
  // Client — optional ref to Client document; clientName kept for backward compat
  client:     { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  clientName: { type: String },
  clientPhone:{ type: String },

  // Production specification fields
  fabricType: { type: String },
  color:      { type: String },
  dimensions: { type: String },
  weight:     { type: String },

  items:          [orderItemSchema],
  laborCost:      { type: Number, default: 0 },
  totalPrice:     { type: Number, default: 0 },
  advancePayment: { type: Number, default: 0 },
  remainingAmount:{ type: Number, default: 0 },

  status: {
    type: String,
    enum: ['pending', 'in_production', 'in_progress', 'ready', 'finished', 'delivered', 'cancelled'],
    default: 'pending',
  },
  paymentStatus: { type: String, enum: ['paid', 'partial', 'unpaid'], default: 'unpaid' },
  orderDate:    { type: Date, default: Date.now },
  deliveryDate: { type: Date },
  notes:        { type: String },
}, { timestamps: true });

orderSchema.pre('save', function (next) {
  this.totalPrice     = this.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0) + (this.laborCost || 0);
  this.remainingAmount = this.totalPrice - this.advancePayment;
  if (this.remainingAmount <= 0)      this.paymentStatus = 'paid';
  else if (this.advancePayment > 0)   this.paymentStatus = 'partial';
  else                                this.paymentStatus = 'unpaid';
  next();
});

module.exports = mongoose.model('Order', orderSchema);

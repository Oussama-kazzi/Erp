const mongoose = require('mongoose');

const quoteItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity:    { type: Number, required: true, min: 0 },
  unitPrice:   { type: Number, required: true, min: 0 },
});

const quoteSchema = new mongoose.Schema({
  quoteNumber:        { type: String, unique: true },
  client:             { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  items:              [quoteItemSchema],
  laborCost:          { type: Number, default: 0 },
  totalPrice:         { type: Number, default: 0 },
  status:             { type: String, enum: ['draft', 'sent', 'accepted', 'rejected', 'converted'], default: 'draft' },
  validUntil:         { type: Date },
  notes:              { type: String },
  convertedToInvoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
}, { timestamps: true });

quoteSchema.pre('save', function (next) {
  this.totalPrice = this.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0) + (this.laborCost || 0);
  next();
});

module.exports = mongoose.model('Quote', quoteSchema);

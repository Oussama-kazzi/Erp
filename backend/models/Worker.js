const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String },
  taskType: { type: String, required: true },
  taskPrice: { type: Number, required: true, default: 0 },
  completedQuantity: { type: Number, default: 0 },
  totalEarned: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  remainingAmount: { type: Number, default: 0 },
  status: { type: String, enum: ['paid', 'partial', 'unpaid'], default: 'unpaid' },
  notes: { type: String },
}, { timestamps: true });

workerSchema.pre('save', function (next) {
  this.totalEarned = this.taskPrice * this.completedQuantity;
  this.remainingAmount = this.totalEarned - this.paidAmount;
  if (this.remainingAmount <= 0) this.status = 'paid';
  else if (this.paidAmount > 0) this.status = 'partial';
  else this.status = 'unpaid';
  next();
});

module.exports = mongoose.model('Worker', workerSchema);

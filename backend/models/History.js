const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  action: { type: String, required: true },
  module: {
    type: String,
    enum: ['order', 'worker', 'supplier', 'product', 'expense', 'auth', 'client', 'quote', 'invoice'],
    required: true,
  },
  description: { type: String, required: true },
  user: { type: String, default: 'admin' },
  referenceId: { type: mongoose.Schema.Types.ObjectId },
  metadata: { type: Object },
}, { timestamps: true });

module.exports = mongoose.model('History', historySchema);

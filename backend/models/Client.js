const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  phone:    { type: String },
  address:  { type: String },
  notes:    { type: String },
}, { timestamps: true });

clientSchema.index({ fullName: 'text' });

module.exports = mongoose.model('Client', clientSchema);

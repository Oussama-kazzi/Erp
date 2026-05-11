const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: {
    type: String,
    enum: ['rent', 'utilities', 'materials', 'transport', 'maintenance', 'salary', 'other'],
    default: 'other',
  },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  note: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);

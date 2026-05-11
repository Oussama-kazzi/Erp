const router = require('express').Router();
const auth = require('../middleware/auth');
const Order = require('../models/Order');
const Worker = require('../models/Worker');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const Expense = require('../models/Expense');
const History = require('../models/History');
const Client = require('../models/Client');
const Invoice = require('../models/Invoice');
const Quote = require('../models/Quote');

router.get('/', auth, async (req, res) => {
  try {
    const [orders, workers, expenses, products, recentHistory, clientCount, invoices, quotes] = await Promise.all([
      Order.find(),
      Worker.find(),
      Expense.find(),
      Product.find(),
      History.find().sort({ createdAt: -1 }).limit(12),
      Client.countDocuments(),
      Invoice.find(),
      Quote.countDocuments(),
    ]);

    const totalIncome = orders
      .filter(o => o.paymentStatus !== 'unpaid')
      .reduce((s, o) => s + o.advancePayment, 0);

    const totalExpenses     = expenses.reduce((s, e) => s + e.amount, 0);
    const workersUnpaid     = workers.reduce((s, w) => s + w.remainingAmount, 0);
    const paidOrders        = orders.filter(o => o.paymentStatus === 'paid').length;
    const pendingOrders     = orders.filter(o => ['pending', 'in_production', 'in_progress'].includes(o.status)).length;
    const readyNotSold      = products.filter(p => p.status === 'available').reduce((s, p) => s + p.quantity, 0);
    const remainingUnpaid   = orders.reduce((s, o) => s + o.remainingAmount, 0);
    const lowStockCount     = products.filter(p => p.quantity <= (p.lowStockThreshold ?? 5) && p.status === 'available').length;
    const totalInvoiceRevenue = invoices.reduce((s, i) => s + i.paidAmount, 0);
    const totalQuotes       = quotes;

    // Last 6 months chart data
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push({ year: d.getFullYear(), month: d.getMonth() });
    }

    const chartData = months.map(({ year, month }) => {
      const label = new Date(year, month).toLocaleString('default', { month: 'short' });
      const monthOrders = orders.filter(o => {
        const d = new Date(o.orderDate);
        return d.getFullYear() === year && d.getMonth() === month;
      });
      const monthExpenses = expenses.filter(e => {
        const d = new Date(e.date);
        return d.getFullYear() === year && d.getMonth() === month;
      });
      return {
        month: label,
        income:   monthOrders.reduce((s, o) => s + o.advancePayment, 0),
        expenses: monthExpenses.reduce((s, e) => s + e.amount, 0),
        orders:   monthOrders.length,
      };
    });

    res.json({
      stats: {
        totalIncome, totalExpenses, remainingUnpaid, paidOrders, pendingOrders,
        readyNotSold, workersUnpaid, lowStockCount,
        totalClients: clientCount,
        totalInvoices: invoices.length,
        totalQuotes,
        totalInvoiceRevenue,
      },
      chartData,
      recentActivity: recentHistory,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Worker = require('./models/Worker');
const Supplier = require('./models/Supplier');
const Order = require('./models/Order');
const Product = require('./models/Product');
const Expense = require('./models/Expense');
const History = require('./models/History');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Clear all collections
  await Promise.all([
    User.deleteMany(),
    Worker.deleteMany(),
    Supplier.deleteMany(),
    Order.deleteMany(),
    Product.deleteMany(),
    Expense.deleteMany(),
    History.deleteMany(),
  ]);
  console.log('Cleared all collections');

  // Create admin user
  await User.create({ name: 'Admin', email: 'admin@erp.com', password: 'admin123', role: 'admin' });
  console.log('Admin created: admin@erp.com / admin123');

  // Workers
  const workers = await Worker.create([
    { name: 'Ahmed Khalil', phone: '0612345678', taskType: 'Cutting', taskPrice: 15, completedQuantity: 40, paidAmount: 400 },
    { name: 'Mohamed Saad', phone: '0623456789', taskType: 'Sewing', taskPrice: 25, completedQuantity: 30, paidAmount: 500 },
    { name: 'Fatima Zahra', phone: '0634567890', taskType: 'Finishing', taskPrice: 10, completedQuantity: 60, paidAmount: 600 },
    { name: 'Omar Benali', phone: '0645678901', taskType: 'Packaging', taskPrice: 8, completedQuantity: 80, paidAmount: 0 },
    { name: 'Youssef Idrissi', phone: '0656789012', taskType: 'Embroidery', taskPrice: 30, completedQuantity: 20, paidAmount: 600 },
  ]);

  // Suppliers
  const suppliers = await Supplier.create([
    {
      name: 'Textile Maroc', phone: '0661234567', product: 'Cotton Fabric', category: 'Fabric',
      totalAmount: 15000, paidAmount: 10000,
      paymentHistory: [{ amount: 5000, note: 'First payment' }, { amount: 5000, note: 'Second payment' }],
    },
    {
      name: 'Fil & Co', phone: '0672345678', product: 'Thread & Buttons', category: 'Accessories',
      totalAmount: 3500, paidAmount: 3500,
      paymentHistory: [{ amount: 3500, note: 'Full payment' }],
    },
    {
      name: 'Emballage Plus', phone: '0683456789', product: 'Packaging Materials', category: 'Packaging',
      totalAmount: 2000, paidAmount: 0,
      paymentHistory: [],
    },
    {
      name: 'Dye Masters', phone: '0694567890', product: 'Fabric Dye', category: 'Chemicals',
      totalAmount: 4500, paidAmount: 2000,
      paymentHistory: [{ amount: 2000, note: 'Partial payment' }],
    },
  ]);

  // Orders
  const now = new Date();
  const past = (days) => new Date(now - days * 86400000);

  await Order.create([
    {
      clientName: 'Boutique Nour', clientPhone: '0611111111',
      items: [{ name: 'Djellaba Femme', quantity: 20, unitPrice: 150 }, { name: 'Caftan', quantity: 10, unitPrice: 300 }],
      advancePayment: 2000, orderDate: past(30), deliveryDate: past(5), status: 'delivered',
    },
    {
      clientName: 'Mode Express', clientPhone: '0622222222',
      items: [{ name: 'T-Shirt', quantity: 100, unitPrice: 45 }],
      advancePayment: 2250, orderDate: past(20), deliveryDate: past(2), status: 'ready',
    },
    {
      clientName: 'Fashion House', clientPhone: '0633333333',
      items: [{ name: 'Blouse', quantity: 50, unitPrice: 80 }, { name: 'Jupe', quantity: 30, unitPrice: 60 }],
      advancePayment: 1000, orderDate: past(10), deliveryDate: new Date(now.getTime() + 5 * 86400000), status: 'in_production',
    },
    {
      clientName: 'Karim Tahiri', clientPhone: '0644444444',
      items: [{ name: 'Costume Sur Mesure', quantity: 1, unitPrice: 1200 }],
      advancePayment: 600, orderDate: past(7), deliveryDate: new Date(now.getTime() + 7 * 86400000), status: 'in_production',
    },
    {
      clientName: 'Sana Boutique', clientPhone: '0655555555',
      items: [{ name: 'Robe Soirée', quantity: 15, unitPrice: 250 }],
      advancePayment: 0, orderDate: past(3), deliveryDate: new Date(now.getTime() + 14 * 86400000), status: 'pending',
    },
    {
      clientName: 'Al Moda', clientPhone: '0666666666',
      items: [{ name: 'Pantalon', quantity: 40, unitPrice: 70 }, { name: 'Chemise', quantity: 40, unitPrice: 55 }],
      advancePayment: 3000, orderDate: past(45), deliveryDate: past(15), status: 'delivered',
    },
  ]);

  // Products
  await Product.create([
    { name: 'Djellaba Femme', category: 'Traditional', supplier: 'Textile Maroc', quantity: 15, costPrice: 80, sellingPrice: 150, status: 'available' },
    { name: 'T-Shirt Blanc', category: 'Casual', supplier: 'Textile Maroc', quantity: 50, costPrice: 20, sellingPrice: 45, status: 'available' },
    { name: 'Blouse Fleurie', category: 'Ladies', supplier: 'Dye Masters', quantity: 8, costPrice: 40, sellingPrice: 80, status: 'reserved' },
    { name: 'Costume Gris', category: 'Formal', supplier: 'Textile Maroc', quantity: 3, costPrice: 600, sellingPrice: 1200, status: 'available' },
    { name: 'Jupe Midi', category: 'Ladies', supplier: 'Fil & Co', quantity: 0, costPrice: 30, sellingPrice: 60, status: 'sold' },
    { name: 'Caftan Luxe', category: 'Traditional', supplier: 'Textile Maroc', quantity: 5, costPrice: 150, sellingPrice: 300, status: 'available' },
    { name: 'Pantalon Noir', category: 'Formal', supplier: 'Textile Maroc', quantity: 12, costPrice: 35, sellingPrice: 70, status: 'available' },
  ]);

  // Expenses
  const expCategories = ['rent', 'utilities', 'materials', 'transport', 'maintenance', 'other'];
  await Expense.create([
    { title: 'Loyer Atelier', category: 'rent', amount: 3500, date: past(1), note: 'Mai 2024' },
    { title: 'Électricité', category: 'utilities', amount: 450, date: past(3), note: 'Facture mensuelle' },
    { title: 'Fils et Boutons', category: 'materials', amount: 800, date: past(5) },
    { title: 'Transport Livraison', category: 'transport', amount: 250, date: past(7) },
    { title: 'Réparation Machine', category: 'maintenance', amount: 600, date: past(10), note: 'Machine Surjeteuse' },
    { title: 'Eau', category: 'utilities', amount: 120, date: past(12) },
    { title: 'Matières Premières', category: 'materials', amount: 2200, date: past(15) },
    { title: 'Loyer Atelier', category: 'rent', amount: 3500, date: past(31), note: 'Avril 2024' },
    { title: 'Papeterie', category: 'other', amount: 80, date: past(20) },
    { title: 'Carburant', category: 'transport', amount: 350, date: past(25) },
  ]);

  // History logs
  await History.create([
    { action: 'created', module: 'order', description: 'Order for "Boutique Nour" created', user: 'Admin' },
    { action: 'payment', module: 'order', description: 'Payment of 2000 added for "Boutique Nour"', user: 'Admin' },
    { action: 'created', module: 'worker', description: 'Worker "Ahmed Khalil" added', user: 'Admin' },
    { action: 'payment', module: 'worker', description: 'Worker "Ahmed Khalil" paid 400', user: 'Admin' },
    { action: 'created', module: 'supplier', description: 'Supplier "Textile Maroc" added', user: 'Admin' },
    { action: 'payment', module: 'supplier', description: 'Supplier "Textile Maroc" paid 5000', user: 'Admin' },
    { action: 'created', module: 'expense', description: 'Expense "Loyer Atelier" of 3500 added', user: 'Admin' },
    { action: 'updated', module: 'order', description: 'Order for "Mode Express" updated to ready', user: 'Admin' },
    { action: 'created', module: 'product', description: 'Product "Caftan Luxe" added to stock', user: 'Admin' },
    { action: 'created', module: 'order', description: 'Order for "Sana Boutique" created', user: 'Admin' },
  ]);

  console.log('Seed data inserted successfully!');
  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

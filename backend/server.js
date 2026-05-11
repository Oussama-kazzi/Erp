const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/workers', require('./routes/workers'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/products', require('./routes/products'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/history', require('./routes/history'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/quotes', require('./routes/quotes'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/stock-movements', require('./routes/stockMovements'));
app.use('/api/settings',       require('./routes/settings'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    const startServer = (port) => {
      const server = app.listen(port, () =>
        console.log(`Server running on port ${port}`)
      );
      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.warn(`⚠️  Port ${port} in use, trying ${port + 1}...`);
          startServer(port + 1);
        } else {
          console.error(err);
          process.exit(1);
        }
      });
    };
    startServer(parseInt(process.env.PORT) || 5000);
  })
  .catch((err) => {
    console.error('\n❌ MongoDB connection failed:', err.message);
    console.error('👉 Make sure MongoDB is running: mongod --dbpath %USERPROFILE%\\mongodb\\data');
    process.exit(1);
  });

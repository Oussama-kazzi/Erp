import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CompanyProvider } from './context/CompanyContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Workers from './pages/Workers';
import Suppliers from './pages/Suppliers';
import Orders from './pages/Orders';
import Quotes from './pages/Quotes';
import Invoices from './pages/Invoices';
import Products from './pages/Products';
import Expenses from './pages/Expenses';
import History from './pages/History';
import Settings from './pages/Settings';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-2 border-sand-200 border-t-bronze-400 rounded-full animate-spin" />
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
};

const AppRoutes = () => (
  <>
    <Toaster position="top-right" toastOptions={{ className: 'text-sm font-medium', duration: 3000 }} />
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="clients"  element={<Clients />} />
        <Route path="orders"   element={<Orders />} />
        <Route path="quotes"   element={<Quotes />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="products" element={<Products />} />
        <Route path="workers"  element={<Workers />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="history"  element={<History />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  </>
);

const App = () => (
  <AuthProvider>
    <CompanyProvider>
      <AppRoutes />
    </CompanyProvider>
  </AuthProvider>
);

export default App;

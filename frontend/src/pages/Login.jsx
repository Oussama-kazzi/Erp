import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import { Package, Ruler, HardHat } from 'lucide-react';

const Login = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: 'admin@erp.com', password: 'admin123' });
  const [loading, setLoading] = useState(false);

  if (user) { navigate('/'); return null; }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch {
      toast.error('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#FAFAF8' }}>
      <Toaster position="top-right" />

      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-atelier-dark flex-col justify-between p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-bronze-600/20 pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-bronze-500 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
            </svg>
          </div>
          <div>
            <p className="text-white text-lg font-medium" style={{ fontFamily: '"Cormorant Garamond", serif' }}>Atelier</p>
            <p className="text-sand-500 text-[10px] tracking-widest uppercase">Management System</p>
          </div>
        </div>

        {/* Headline */}
        <div className="relative z-10">
          <h1 className="text-5xl font-medium text-white leading-tight mb-4" style={{ fontFamily: '"Cormorant Garamond", serif' }}>
            Craft. Create.<br />Manage.
          </h1>
          <p className="text-sand-400 text-base leading-relaxed max-w-xs">
            A premium management platform built for furniture workshops, interior studios, and custom atelier production.
          </p>

          <div className="mt-10 flex flex-col gap-4">
            {[
              { icon: Package, label: 'Inventory & Collection management' },
              { icon: Ruler, label: 'Custom project & order tracking' },
              { icon: HardHat, label: 'Atelier team & production overview' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-bronze-400" strokeWidth={1.5} />
                </div>
                <p className="text-sand-400 text-sm">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sand-700 text-xs relative z-10">© 2026 Atelier ERP. All rights reserved.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-8 h-8 bg-atelier-dark rounded-xl flex items-center justify-center">
              <svg className="w-4 h-4 text-bronze-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18" />
              </svg>
            </div>
            <span className="font-medium text-atelier-dark" style={{ fontFamily: '"Cormorant Garamond", serif' }}>Atelier</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-medium text-atelier-dark mb-1.5" style={{ fontFamily: '"Cormorant Garamond", serif' }}>Welcome back</h2>
            <p className="text-sand-400 text-sm">Sign in to your atelier workspace</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="admin@atelier.com"
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5 mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : 'Sign in to Atelier'}
            </button>
          </form>

          <div className="mt-6 p-3 bg-sand-100 rounded-xl border border-sand-200">
            <p className="text-xs text-sand-500 text-center">
              Default access: <span className="text-sand-700 font-medium">admin@erp.com</span> / <span className="text-sand-700 font-medium">admin123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

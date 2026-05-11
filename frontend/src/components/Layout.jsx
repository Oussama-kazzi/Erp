import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, Bell } from 'lucide-react';
import Sidebar from './Sidebar';

const pageMeta = {
  '/':          { title: 'Dashboard',  sub: 'Overview & analytics' },
  '/clients':   { title: 'Clients',    sub: 'Customer management' },
  '/workers':   { title: 'Craftsmen',  sub: 'Atelier team & payroll' },
  '/suppliers': { title: 'Suppliers',  sub: 'Materials & vendor management' },
  '/orders':    { title: 'Orders',     sub: 'Custom commissions & projects' },
  '/quotes':    { title: 'Quotes',     sub: 'Quotes & proposals' },
  '/invoices':  { title: 'Invoices',   sub: 'Billing & payment tracking' },
  '/products':  { title: 'Stock',      sub: 'Inventory & collection' },
  '/expenses':  { title: 'Finance',    sub: 'Expenses & financial tracking' },
  '/history':   { title: 'History',    sub: 'Activity audit log' },
  '/settings':  { title: 'Settings',   sub: 'Preferences & account' },
};

const Layout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const meta = pageMeta[location.pathname] || { title: 'Atelier', sub: '' };

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#FAFAF8' }}>
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(v => !v)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="shrink-0 bg-white border-b border-sand-200 px-4 sm:px-6 md:px-8 py-3 md:py-3.5 flex items-center gap-3">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-xl text-sand-500 hover:text-atelier-dark hover:bg-sand-100 transition-colors shrink-0"
            aria-label="Open menu"
          >
            <Menu className="w-4 h-4" strokeWidth={1.5} />
          </button>

          {/* Title */}
          <div className="flex-1 min-w-0">
            <h1 className="page-title text-[20px] truncate leading-tight">{meta.title}</h1>
            {meta.sub && (
              <p className="text-[11px] text-sand-400 mt-0 hidden sm:block">{meta.sub}</p>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 shrink-0">
            <p className="text-[11px] text-sand-400 hidden lg:block tabular-nums">{dateStr}</p>
            <div className="hidden lg:block w-px h-4 bg-sand-200" />
            <button className="w-8 h-8 rounded-xl border border-sand-200 bg-white flex items-center justify-center text-sand-500 hover:text-atelier-dark hover:border-sand-300 transition-all">
              <Bell className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-5 md:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, ClipboardList, FileText, Receipt,
  Package, Hammer, Truck, Wallet, Clock, Settings,
  ChevronLeft, LogOut, Building2,
} from 'lucide-react';

const navGroups = [
  {
    label: 'Main',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
    ],
  },
  {
    label: 'Business',
    items: [
      { to: '/clients',  label: 'Clients',   icon: Users },
      { to: '/orders',   label: 'Orders',    icon: ClipboardList },
      { to: '/quotes',   label: 'Quotes',    icon: FileText },
      { to: '/invoices', label: 'Invoices',  icon: Receipt },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/products',  label: 'Stock',      icon: Package },
      { to: '/workers',   label: 'Craftsmen',  icon: Hammer },
      { to: '/suppliers', label: 'Suppliers',  icon: Truck },
      { to: '/expenses',  label: 'Finance',    icon: Wallet },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/history',  label: 'History',  icon: Clock },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

const Sidebar = ({ collapsed, onToggle, mobileOpen, onMobileClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const showLabels = !collapsed || mobileOpen;

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-atelier-dark/60 backdrop-blur-sm md:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`
          flex flex-col shrink-0 h-full
          bg-atelier-dark border-r border-white/[0.06]
          transition-all duration-300 ease-in-out
          fixed inset-y-0 left-0 z-40 w-64
          md:static md:inset-auto md:z-auto
          ${collapsed ? 'md:w-[60px]' : 'md:w-56'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className={`flex items-center gap-3 border-b border-white/[0.06] shrink-0 ${showLabels ? 'px-4 py-[18px]' : 'justify-center px-3 py-[18px]'}`}>
          <div className="w-8 h-8 bg-bronze-500 rounded-lg flex items-center justify-center shrink-0">
            <Building2 className="w-[15px] h-[15px] text-white" strokeWidth={1.75} />
          </div>
          {showLabels && (
            <div>
              <p className="text-sand-100 text-[15px] font-medium leading-tight tracking-wide" style={{ fontFamily: '"Cormorant Garamond", serif' }}>
                Atelier
              </p>
              <p className="text-sand-600 text-[9px] tracking-[0.2em] uppercase mt-0.5">Management</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              {showLabels && (
                <p className="px-3 mb-1.5 text-[9px] font-semibold text-sand-700 uppercase tracking-[0.15em]">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    title={!showLabels ? item.label : undefined}
                    onClick={onMobileClose}
                    className={({ isActive }) =>
                      `relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] transition-all duration-150 group
                      ${!showLabels ? 'justify-center' : ''}
                      ${isActive
                        ? 'bg-white/[0.08] text-sand-100'
                        : 'text-sand-500 hover:bg-white/[0.04] hover:text-sand-300'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-[18px] w-0.5 bg-bronze-400 rounded-r-full" />
                        )}
                        <item.icon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            isActive ? 'text-bronze-400' : 'text-sand-600 group-hover:text-sand-400'
                          }`}
                          strokeWidth={1.5}
                        />
                        {showLabels && (
                          <span className={`truncate ${isActive ? 'font-medium' : 'font-normal'}`}>
                            {item.label}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User + collapse */}
        <div className="border-t border-white/[0.06] p-3 space-y-1 shrink-0">
          {showLabels ? (
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/[0.04] transition-colors group cursor-default">
              <div className="w-7 h-7 rounded-lg bg-bronze-600/80 flex items-center justify-center text-white text-[11px] font-semibold shrink-0">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sand-300 text-[12px] font-medium truncate leading-tight">{user?.name}</p>
                <p className="text-sand-600 text-[10px] capitalize leading-tight mt-0.5">{user?.role}</p>
              </div>
              <button
                onClick={() => { logout(); navigate('/login'); }}
                className="text-sand-700 hover:text-red-400 transition-colors p-1 opacity-0 group-hover:opacity-100 rounded-lg"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="w-full flex justify-center p-2 text-sand-700 hover:text-red-400 transition-colors rounded-xl hover:bg-white/[0.04]"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" strokeWidth={1.5} />
            </button>
          )}

          <button
            onClick={onToggle}
            className="hidden md:flex w-full items-center justify-center p-1.5 text-sand-700 hover:text-sand-400 hover:bg-white/[0.04] rounded-xl transition-all"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft
              className={`w-4 h-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
              strokeWidth={1.5}
            />
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

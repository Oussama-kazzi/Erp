import React, { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  ClipboardList, Hammer, Truck, Wallet, Package,
  ShieldCheck, Users, FileText, Receipt, Activity,
  TrendingUp,
} from 'lucide-react';
import api from '../api';
import DashboardCard from '../components/ui/DashboardCard';
import StatusBadge from '../components/ui/StatusBadge';
import { useAuth } from '../context/AuthContext';

const fmt = (n) => new Intl.NumberFormat('fr-MA', { minimumFractionDigits: 0 }).format(n ?? 0);

const MODULE_ICONS = {
  order:   ClipboardList,
  worker:  Hammer,
  supplier: Truck,
  expense: Wallet,
  product: Package,
  auth:    ShieldCheck,
  client:  Users,
  quote:   FileText,
  invoice: Receipt,
};

const MODULE_LABELS = {
  order: 'Order', worker: 'Craftsman', supplier: 'Supplier',
  expense: 'Finance', product: 'Stock', auth: 'Auth',
  client: 'Client', quote: 'Quote', invoice: 'Invoice',
};

const ACTION_STYLE = {
  created:   { label: 'Created',  cls: 'text-emerald-700 bg-emerald-50' },
  updated:   { label: 'Updated',  cls: 'text-blue-700 bg-blue-50' },
  deleted:   { label: 'Deleted',  cls: 'text-red-600 bg-red-50' },
  payment:   { label: 'Payment',  cls: 'text-bronze-700 bg-bronze-50' },
  stock_in:  { label: 'In',       cls: 'text-teal-700 bg-teal-50' },
  stock_out: { label: 'Out',      cls: 'text-orange-700 bg-orange-50' },
  converted: { label: 'Converted',cls: 'text-violet-700 bg-violet-50' },
};

const ModuleIcon = ({ module }) => {
  const Icon = MODULE_ICONS[module] || Activity;
  return <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-sand-200 rounded-xl p-3 shadow-warm text-xs">
      <p className="font-medium text-sand-700 mb-1.5">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex justify-between gap-3" style={{ color: p.color }}>
          <span>{p.name}</span>
          <span className="font-medium">{fmt(p.value)} MAD</span>
        </p>
      ))}
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 border-2 border-sand-200 border-t-bronze-400 rounded-full animate-spin" />
    </div>
  );

  const { stats, chartData, recentActivity } = data || {};
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-5">

      {/* Welcome */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sand-400 text-[13px] mb-0.5">{greeting},</p>
          <h2 className="display-title">{user?.name}</h2>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-[11px] text-sand-400 bg-white border border-sand-200 rounded-xl px-3.5 py-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          System online
        </div>
      </div>

      {/* Primary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <DashboardCard
          accent
          title="Revenue"
          value={`${fmt(stats?.totalIncome)} MAD`}
          subtitle="Payments received"
          icon={<TrendingUp className="w-5 h-5 text-bronze-300" strokeWidth={1.5} />}
        />
        <DashboardCard
          title="Expenses"
          value={`${fmt(stats?.totalExpenses)} MAD`}
          subtitle="Total outgoings"
          icon={<Wallet className="w-5 h-5 text-sand-400" strokeWidth={1.5} />}
        />
        <DashboardCard
          title="Receivable"
          value={`${fmt(stats?.remainingUnpaid)} MAD`}
          subtitle="Owed by clients"
          icon={<Receipt className="w-5 h-5 text-sand-400" strokeWidth={1.5} />}
        />
        <DashboardCard
          title="Atelier Payroll"
          value={`${fmt(stats?.workersUnpaid)} MAD`}
          subtitle="Owed to craftsmen"
          icon={<Hammer className="w-5 h-5 text-sand-400" strokeWidth={1.5} />}
        />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Completed Orders', value: stats?.paidOrders ?? 0, desc: 'Fully settled' },
          { label: 'Active Orders',    value: stats?.pendingOrders ?? 0, desc: 'In production' },
          { label: 'Stock Units',      value: fmt(stats?.readyNotSold), desc: 'Available inventory' },
          { label: 'Low Stock Alerts', value: stats?.lowStockCount ?? 0, desc: 'Below threshold', warn: (stats?.lowStockCount ?? 0) > 0 },
        ].map((s) => (
          <div key={s.label} className="card px-4 py-4">
            <p className="text-[10px] font-semibold text-sand-400 uppercase tracking-wider">{s.label}</p>
            <p className={`text-xl font-semibold mt-1 ${s.warn ? 'text-amber-600' : 'text-atelier-dark'}`}>{s.value}</p>
            <p className="text-[11px] text-sand-400 mt-0.5">{s.desc}</p>
          </div>
        ))}
      </div>

      {/* Charts + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Area chart */}
        <div className="card p-5 lg:col-span-2">
          <div className="mb-5">
            <h3 className="section-title text-[16px]">Financial Overview</h3>
            <p className="text-[11px] text-sand-400 mt-0.5">Revenue vs expenses — last 6 months</p>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#B8936A" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#B8936A" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6B6058" stopOpacity={0.10} />
                  <stop offset="100%" stopColor="#6B6058" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDE7DF" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#A89A8E' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#A89A8E' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="income" stroke="#B8936A" fill="url(#gIncome)" strokeWidth={1.5} name="Revenue" dot={false} />
              <Area type="monotone" dataKey="expenses" stroke="#8A7B6F" fill="url(#gExpense)" strokeWidth={1.5} name="Expenses" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Activity feed */}
        <div className="card p-5 flex flex-col">
          <h3 className="section-title text-[16px] mb-4">Recent Activity</h3>
          {!recentActivity?.length ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-[13px] text-sand-400">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-2.5 overflow-y-auto">
              {recentActivity.map((item) => {
                const action = ACTION_STYLE[item.action] || { label: item.action, cls: 'text-sand-500 bg-sand-100' };
                return (
                  <div key={item._id} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-sand-100 flex items-center justify-center text-sand-500 shrink-0 mt-0.5">
                      <ModuleIcon module={item.module} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${action.cls}`}>{action.label}</span>
                        <span className="text-[10px] text-sand-400">{MODULE_LABELS[item.module] || item.module}</span>
                      </div>
                      <p className="text-[12px] text-sand-700 leading-snug">{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bar chart */}
      <div className="card p-5">
        <div className="mb-4">
          <h3 className="section-title text-[16px]">Order Volume</h3>
          <p className="text-[11px] text-sand-400 mt-0.5">Number of orders per month</p>
        </div>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={chartData} margin={{ top: 0, right: 5, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EDE7DF" horizontal vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#A89A8E' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#A89A8E' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="orders" fill="#B8936A" radius={[3, 3, 0, 0]} name="Orders" opacity={0.85} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Dashboard;

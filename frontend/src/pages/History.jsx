import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  ClipboardList, Hammer, Truck, Wallet, Package,
  ShieldCheck, Users, FileText, Receipt, Activity,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const MODULE_ICON_MAP = {
  order: ClipboardList, worker: Hammer, supplier: Truck,
  expense: Wallet, product: Package, auth: ShieldCheck,
  client: Users, quote: FileText, invoice: Receipt,
};
const MODULE_LABEL = {
  order: 'Order', worker: 'Craftsman', supplier: 'Supplier',
  expense: 'Finance', product: 'Stock', auth: 'Auth',
  client: 'Client', quote: 'Quote', invoice: 'Invoice',
};
const ACTION_CONFIG = {
  created:   { label: 'Created',   color: 'text-emerald-700', bg: 'bg-emerald-50',  dot: 'bg-emerald-500' },
  updated:   { label: 'Updated',   color: 'text-blue-700',    bg: 'bg-blue-50',     dot: 'bg-blue-500' },
  deleted:   { label: 'Deleted',   color: 'text-red-600',     bg: 'bg-red-50',      dot: 'bg-red-400' },
  payment:   { label: 'Payment',   color: 'text-bronze-700',  bg: 'bg-bronze-50',   dot: 'bg-bronze-400' },
  stock_in:  { label: 'Stock In',  color: 'text-teal-700',    bg: 'bg-teal-50',     dot: 'bg-teal-500' },
  stock_out: { label: 'Stock Out', color: 'text-orange-700',  bg: 'bg-orange-50',   dot: 'bg-orange-400' },
  converted: { label: 'Converted', color: 'text-violet-700',  bg: 'bg-violet-50',   dot: 'bg-violet-500' },
  rejected:  { label: 'Rejected',  color: 'text-rose-700',    bg: 'bg-rose-50',     dot: 'bg-rose-500' },
};

const MODULE_OPTS = ['order', 'worker', 'supplier', 'product', 'expense', 'client', 'quote', 'invoice', 'auth']
  .map(m => ({ value: m, label: MODULE_LABEL[m] || m }));
const ACTION_OPTS = ['created', 'updated', 'deleted', 'payment', 'stock_in', 'stock_out', 'converted', 'rejected']
  .map(a => ({ value: a, label: ACTION_CONFIG[a]?.label || a }));

const ModuleIcon = ({ module }) => {
  const Icon = MODULE_ICON_MAP[module] || Activity;
  return <Icon className="w-4 h-4" strokeWidth={1.5} />;
};

const History = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('history').select('*').order('created_at', { ascending: false }).limit(200);
      if (moduleFilter) query = query.eq('module', moduleFilter);
      if (actionFilter) query = query.eq('action', actionFilter);
      const { data, error } = await query;
      if (error) throw error;
      setHistory(data || []);
    } catch { toast.error('Failed to load activity'); }
    finally { setLoading(false); }
  }, [moduleFilter, actionFilter]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const groupByDate = (items) => {
    const groups = {};
    items.forEach(item => {
      const date = new Date(item.created_at).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    });
    return groups;
  };

  const grouped = groupByDate(history);

  const FilterBtn = ({ active, onClick, children }) => (
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${active ? 'bg-white shadow-warm-xs text-atelier-dark' : 'text-sand-500 hover:text-sand-700'}`}>
      {children}
    </button>
  );

  return (
    <div className="space-y-5">
      <div className="card p-4 flex flex-col gap-3">
        <div className="flex flex-wrap gap-1 bg-sand-100 p-1 rounded-xl">
          <FilterBtn active={moduleFilter === ''} onClick={() => setModuleFilter('')}>All modules</FilterBtn>
          {MODULE_OPTS.map(o => (
            <FilterBtn key={o.value} active={moduleFilter === o.value} onClick={() => setModuleFilter(o.value)}>
              {o.label}
            </FilterBtn>
          ))}
        </div>
        <div className="flex flex-wrap gap-1 bg-sand-100 p-1 rounded-xl">
          <FilterBtn active={actionFilter === ''} onClick={() => setActionFilter('')}>All actions</FilterBtn>
          {ACTION_OPTS.map(o => (
            <FilterBtn key={o.value} active={actionFilter === o.value} onClick={() => setActionFilter(o.value)}>
              {o.label}
            </FilterBtn>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-sand-400 uppercase tracking-wide px-1">{history.length} entries</p>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-sand-200 border-t-bronze-400 rounded-full animate-spin" />
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-10 h-10 rounded-xl bg-sand-100 flex items-center justify-center mx-auto mb-3">
            <Activity className="w-5 h-5 text-sand-300" strokeWidth={1.5} />
          </div>
          <p className="text-[13px] text-sand-400">No activity recorded</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-3">
                <p className="text-[10px] font-semibold text-sand-500 uppercase tracking-wider">{date}</p>
                <div className="flex-1 h-px bg-sand-200" />
                <span className="text-[10px] text-sand-400 bg-sand-100 px-2 py-0.5 rounded-full">{items.length}</span>
              </div>
              <div className="card overflow-hidden">
                {items.map((item, i) => {
                  const action = ACTION_CONFIG[item.action] || { label: item.action, color: 'text-sand-600', bg: 'bg-sand-100', dot: 'bg-sand-400' };
                  return (
                    <div key={item.id}
                      className={`flex items-start gap-4 px-5 py-3.5 hover:bg-sand-50 transition-colors ${i !== 0 ? 'border-t border-sand-100' : ''}`}>
                      <div className="w-8 h-8 rounded-xl bg-sand-100 flex items-center justify-center text-sand-500 shrink-0 mt-0.5">
                        <ModuleIcon module={item.module} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${action.bg} ${action.color}`}>
                            <span className={`w-1 h-1 rounded-full ${action.dot}`} />
                            {action.label}
                          </span>
                          <span className="text-[11px] text-sand-400">{MODULE_LABEL[item.module] || item.module}</span>
                        </div>
                        <p className="text-[13px] text-atelier-dark leading-snug">{item.description}</p>
                        {item.user_name && <p className="text-[11px] text-sand-400 mt-0.5">by {item.user_name}</p>}
                      </div>
                      <p className="text-[11px] text-sand-400 shrink-0 tabular-nums mt-0.5">
                        {new Date(item.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;

import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Home, Zap, Package, Truck, Wrench, Users, CreditCard, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { logHistory } from '../lib/history';
import Modal from '../components/ui/Modal';
import FormInput from '../components/ui/FormInput';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const fmt = (n) => new Intl.NumberFormat('fr-MA').format(n ?? 0);

const cats = ['rent', 'utilities', 'materials', 'transport', 'maintenance', 'salary', 'other'];
const catOpts = cats.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }));
const empty = { title: '', category: 'other', amount: '', date: new Date().toISOString().split('T')[0], note: '' };
const PALETTE = ['#B8936A', '#8A7B6F', '#C8BDB4', '#6B5E54', '#D4A87A', '#A89A8E', '#4A3F38'];

const CAT_ICON = {
  rent: Home, utilities: Zap, materials: Package, transport: Truck,
  maintenance: Wrench, salary: Users, other: CreditCard,
};
const CatIcon = ({ category, className = 'w-4 h-4' }) => {
  const Icon = CAT_ICON[category] || CreditCard;
  return <Icon className={className} strokeWidth={1.5} />;
};
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-sand-200 rounded-xl p-3 shadow-warm text-xs">
      <p className="font-medium text-atelier-dark">{payload[0].name}</p>
      <p className="text-sand-500 mt-0.5">{fmt(payload[0].value)} MAD</p>
    </div>
  );
};

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('expenses').select('*').order('date', { ascending: false });
      if (catFilter) query = query.eq('category', catFilter);
      const { data, error } = await query;
      if (error) throw error;
      setExpenses(data || []);
    } catch { toast.error('Failed to load expenses'); }
    finally { setLoading(false); }
  }, [catFilter]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const openAdd = () => { setForm(empty); setModal('add'); };
  const openEdit = (e) => { setForm({ ...e, date: e.date?.split('T')[0] || '' }); setSelected(e); setModal('edit'); };
  const openDelete = (e) => { setSelected(e); setModal('delete'); };
  const closeModal = () => { setModal(null); setSelected(null); };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { title: form.title, category: form.category, amount: Number(form.amount) || 0, date: form.date, note: form.note };
      if (modal === 'add') {
        const { data, error } = await supabase.from('expenses').insert(payload).select().single();
        if (error) throw error;
        await logHistory({ action: 'created', module: 'expense', description: `Expense "${form.title}" — ${fmt(form.amount)} MAD`, referenceId: data.id });
      } else {
        await supabase.from('expenses').update(payload).eq('id', selected.id);
        await logHistory({ action: 'updated', module: 'expense', description: `Expense "${form.title}" updated`, referenceId: selected.id });
      }
      toast.success(modal === 'add' ? 'Expense recorded' : 'Updated');
      closeModal(); fetchExpenses();
    } catch (err) { toast.error(err.message || 'Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await supabase.from('expenses').delete().eq('id', selected.id);
      await logHistory({ action: 'deleted', module: 'expense', description: `Expense "${selected.title}" removed` });
      toast.success('Removed'); closeModal(); fetchExpenses();
    } catch { toast.error('Error'); } finally { setSaving(false); }
  };

  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const pieData = cats.map(cat => ({
    name: cat.charAt(0).toUpperCase() + cat.slice(1),
    value: expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter(d => d.value > 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <div className="card px-4 py-2.5 flex items-center gap-2">
            <span className="text-sand-400 text-xs uppercase tracking-wide">Total Spent</span>
            <span className="text-red-600 font-semibold">{fmt(total)} MAD</span>
          </div>
          <div className="card px-4 py-2.5 flex items-center gap-2">
            <span className="text-sand-400 text-xs uppercase tracking-wide">Entries</span>
            <span className="text-atelier-dark font-semibold">{expenses.length}</span>
          </div>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus className="w-4 h-4" strokeWidth={2} />
          Record Expense
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card p-5 flex flex-col">
          <h3 className="section-title text-[16px] mb-4">By Category</h3>
          {pieData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-10 h-10 rounded-xl bg-sand-100 flex items-center justify-center mx-auto mb-2">
                  <CreditCard className="w-5 h-5 text-sand-300" strokeWidth={1.5} />
                </div>
                <p className="text-[13px] text-sand-400">No data yet</p>
              </div>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
                      <span className="text-sand-600">{d.name}</span>
                    </div>
                    <span className="font-medium text-atelier-dark">{fmt(d.value)} MAD</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="card lg:col-span-2 overflow-hidden">
          <div className="p-4 border-b border-sand-100 flex items-center gap-1.5 flex-wrap">
            {[{ value: '', label: 'All' }, ...catOpts].map(o => (
              <button key={o.value} onClick={() => setCatFilter(o.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${catFilter === o.value ? 'bg-atelier-dark text-white' : 'bg-sand-100 text-sand-600 hover:bg-sand-200'}`}>
                {o.value && <CatIcon category={o.value} className="w-3 h-3" />}
                {o.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-7 h-7 border-2 border-sand-200 border-t-bronze-400 rounded-full animate-spin" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-10 h-10 rounded-xl bg-sand-100 flex items-center justify-center mx-auto mb-2">
                <CreditCard className="w-5 h-5 text-sand-300" strokeWidth={1.5} />
              </div>
              <p className="text-[13px] text-sand-400">No expenses recorded</p>
            </div>
          ) : (
            <div className="divide-y divide-sand-100">
              {expenses.map(exp => (
                <div key={exp.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-sand-50 transition-colors group">
                  <div className="w-9 h-9 rounded-xl bg-sand-100 flex items-center justify-center text-sand-500 shrink-0">
                    <CatIcon category={exp.category} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-atelier-dark truncate">{exp.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-sand-400 capitalize">{exp.category}</span>
                      {exp.note && <><span className="text-sand-200">·</span><span className="text-[11px] text-sand-400 truncate">{exp.note}</span></>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[13px] font-semibold text-atelier-dark">{fmt(exp.amount)} MAD</p>
                    <p className="text-[11px] text-sand-400 mt-0.5">{exp.date ? new Date(exp.date).toLocaleDateString('fr-MA') : '—'}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => openEdit(exp)} className="w-7 h-7 flex items-center justify-center rounded-lg text-sand-400 hover:text-atelier-dark hover:bg-sand-100 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
                    </button>
                    <button onClick={() => openDelete(exp)} className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={modal === 'add' || modal === 'edit'} onClose={closeModal} title={modal === 'add' ? 'Record Expense' : 'Edit Expense'} size="sm">
        <form onSubmit={handleSave} className="space-y-4">
          <FormInput label="Description" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required placeholder="e.g. Oak planks purchase" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {catOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <FormInput label="Amount (MAD)" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required min="1" />
          </div>
          <FormInput label="Date" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          <FormInput label="Note (optional)" type="textarea" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={modal === 'delete'} onClose={closeModal} onConfirm={handleDelete} loading={saving}
        title="Delete Expense" message={`Delete "${selected?.title}"?`} />
    </div>
  );
};

export default Expenses;

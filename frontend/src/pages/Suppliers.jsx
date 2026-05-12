import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Truck, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { logHistory } from '../lib/history';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import SearchInput from '../components/ui/SearchInput';
import FormInput from '../components/ui/FormInput';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const fmt = (n) => new Intl.NumberFormat('fr-MA').format(n ?? 0);
const empty = { name: '', phone: '', product: '', category: 'other', total_amount: '', paid_amount: '', notes: '' };

const categoryColors = {
  wood: 'bg-amber-50 text-amber-700',
  fabric: 'bg-purple-50 text-purple-700',
  metal: 'bg-slate-100 text-slate-700',
  paint: 'bg-blue-50 text-blue-700',
  hardware: 'bg-sand-100 text-sand-700',
  other: 'bg-sand-50 text-sand-600',
};

const getStatus = (s) => {
  const remaining = (s.total_amount || 0) - (s.paid_amount || 0);
  if (remaining <= 0) return 'paid';
  if ((s.paid_amount || 0) > 0) return 'partial';
  return 'unpaid';
};

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', note: '' });

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('suppliers').select('*').order('created_at', { ascending: false });
      if (search) query = query.ilike('name', `%${search}%`);
      const { data, error } = await query;
      if (error) throw error;
      let list = data || [];
      if (statusFilter) list = list.filter(s => getStatus(s) === statusFilter);
      setSuppliers(list);
    } catch { toast.error('Failed to load suppliers'); }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const openAdd = () => { setForm(empty); setModal('add'); };
  const openEdit = (s) => { setForm(s); setSelected(s); setModal('edit'); };
  const openPay = (s) => { setSelected(s); setPayForm({ amount: '', note: '' }); setModal('pay'); };
  const openDelete = (s) => { setSelected(s); setModal('delete'); };
  const closeModal = () => { setModal(null); setSelected(null); };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = {
        name: form.name, phone: form.phone, product: form.product, category: form.category,
        total_amount: Number(form.total_amount) || 0,
        paid_amount: Number(form.paid_amount) || 0,
        notes: form.notes,
      };
      if (modal === 'add') {
        const { data, error } = await supabase.from('suppliers').insert(payload).select().single();
        if (error) throw error;
        await logHistory({ action: 'created', module: 'supplier', description: `Supplier "${form.name}" added`, referenceId: data.id });
      } else {
        await supabase.from('suppliers').update(payload).eq('id', selected.id);
        await logHistory({ action: 'updated', module: 'supplier', description: `Supplier "${form.name}" updated`, referenceId: selected.id });
      }
      toast.success(modal === 'add' ? 'Supplier added' : 'Updated');
      closeModal(); fetchSuppliers();
    } catch (err) { toast.error(err.message || 'Error'); }
    finally { setSaving(false); }
  };

  const handlePay = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const newPaid = (selected.paid_amount || 0) + Number(payForm.amount);
      await supabase.from('suppliers').update({ paid_amount: newPaid }).eq('id', selected.id);
      await logHistory({
        action: 'payment', module: 'supplier',
        description: `Payment of ${fmt(payForm.amount)} MAD to "${selected.name}"`,
        referenceId: selected.id,
      });
      toast.success('Payment recorded'); closeModal(); fetchSuppliers();
    } catch (err) { toast.error(err.message || 'Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await supabase.from('suppliers').delete().eq('id', selected.id);
      await logHistory({ action: 'deleted', module: 'supplier', description: `Supplier "${selected.name}" removed` });
      toast.success('Removed'); closeModal(); fetchSuppliers();
    } catch { toast.error('Error'); } finally { setSaving(false); }
  };

  const totalOwed = suppliers.reduce((s, sup) => s + Math.max(0, (sup.total_amount || 0) - (sup.paid_amount || 0)), 0);
  const statusOpts = [{ value: 'paid', label: 'Paid' }, { value: 'partial', label: 'Partial' }, { value: 'unpaid', label: 'Unpaid' }];
  const cats = ['wood', 'fabric', 'metal', 'paint', 'hardware', 'other'];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <div className="card px-4 py-2.5 flex items-center gap-2">
            <span className="text-sand-400 text-xs uppercase tracking-wide">Suppliers</span>
            <span className="text-atelier-dark font-semibold">{suppliers.length}</span>
          </div>
          {totalOwed > 0 && (
            <div className="card px-4 py-2.5 flex items-center gap-2">
              <span className="text-sand-400 text-xs uppercase tracking-wide">Owed</span>
              <span className="text-red-500 font-semibold">{fmt(totalOwed)} MAD</span>
            </div>
          )}
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus className="w-4 h-4" strokeWidth={2} />
          Add Supplier
        </button>
      </div>

      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search suppliers..." />
        <select className="input sm:w-40" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          {statusOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-sand-200 border-t-bronze-400 rounded-full animate-spin" />
        </div>
      ) : suppliers.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-2xl bg-sand-100 flex items-center justify-center mx-auto mb-3">
            <Truck className="w-6 h-6 text-sand-300" strokeWidth={1.5} />
          </div>
          <p className="text-[13px] text-sand-400">No suppliers yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {suppliers.map(s => {
            const remaining = Math.max(0, (s.total_amount || 0) - (s.paid_amount || 0));
            const status = getStatus(s);
            return (
              <div key={s.id} className="card p-5 card-hover flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-atelier-dark text-[14px]">{s.name}</p>
                    {s.phone && <p className="text-[12px] text-sand-400 mt-0.5">{s.phone}</p>}
                  </div>
                  <StatusBadge status={status} />
                </div>

                {(s.product || s.category) && (
                  <div className="flex items-center gap-2 mb-3">
                    {s.product && <p className="text-[12px] text-sand-600">{s.product}</p>}
                    {s.category && (
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${categoryColors[s.category] || categoryColors.other}`}>
                        {s.category}
                      </span>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 text-center mb-4 mt-auto">
                  {[
                    { label: 'Total', value: `${fmt(s.total_amount)} MAD` },
                    { label: 'Paid', value: `${fmt(s.paid_amount)} MAD` },
                    { label: 'Remaining', value: `${fmt(remaining)} MAD`, red: remaining > 0 },
                  ].map(stat => (
                    <div key={stat.label} className="bg-sand-50 rounded-xl p-2">
                      <p className="text-[9px] text-sand-400 uppercase tracking-wide mb-0.5">{stat.label}</p>
                      <p className={`text-[11px] font-semibold ${stat.red ? 'text-red-500' : 'text-atelier-dark'}`}>{stat.value}</p>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-sand-100 flex gap-2">
                  <button onClick={() => openPay(s)} className="btn-primary btn-sm flex-1 justify-center">Pay</button>
                  <button onClick={() => openEdit(s)} className="btn-secondary btn-sm px-3">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
                  </button>
                  <button onClick={() => openDelete(s)} className="btn-ghost btn-sm text-red-400 hover:text-red-600 hover:bg-red-50">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={modal === 'add' || modal === 'edit'} onClose={closeModal} title={modal === 'add' ? 'Add Supplier' : 'Edit Supplier'} size="sm">
        <form onSubmit={handleSave} className="space-y-4">
          <FormInput label="Supplier Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          <FormInput label="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormInput label="Product / Service" value={form.product} onChange={e => setForm({ ...form, product: e.target.value })} />
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {cats.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Total Amount (MAD)" type="number" value={form.total_amount} onChange={e => setForm({ ...form, total_amount: e.target.value })} />
            <FormInput label="Paid Amount (MAD)" type="number" value={form.paid_amount} onChange={e => setForm({ ...form, paid_amount: e.target.value })} />
          </div>
          <FormInput label="Notes" type="textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={modal === 'pay'} onClose={closeModal} title={`Pay — ${selected?.name}`} size="sm">
        <form onSubmit={handlePay} className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-center mb-2">
            {[
              { label: 'Total', value: fmt(selected?.total_amount) },
              { label: 'Remaining', value: fmt(Math.max(0, (selected?.total_amount || 0) - (selected?.paid_amount || 0))) },
            ].map(s => (
              <div key={s.label} className="bg-sand-50 rounded-xl p-3">
                <p className="text-[10px] text-sand-400 uppercase mb-1">{s.label}</p>
                <p className="text-[15px] font-semibold text-atelier-dark">{s.value} MAD</p>
              </div>
            ))}
          </div>
          <FormInput label="Payment Amount (MAD)" type="number" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} required />
          <FormInput label="Note (optional)" value={payForm.note} onChange={e => setPayForm({ ...payForm, note: e.target.value })} />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Record Payment'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={modal === 'delete'} onClose={closeModal} onConfirm={handleDelete} loading={saving}
        title="Remove Supplier" message={`Remove "${selected?.name}"?`} />
    </div>
  );
};

export default Suppliers;

import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../api';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import SearchInput from '../components/ui/SearchInput';
import FormInput from '../components/ui/FormInput';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const fmt = (n) => new Intl.NumberFormat('fr-MA').format(n ?? 0);
const empty = { name: '', phone: '', product: '', category: '', totalAmount: '', paidAmount: '', notes: '' };

const categoryColors = {
  wood: 'bg-amber-50 text-amber-700',
  fabric: 'bg-purple-50 text-purple-700',
  metal: 'bg-slate-100 text-slate-700',
  paint: 'bg-blue-50 text-blue-700',
  hardware: 'bg-sand-100 text-sand-700',
  other: 'bg-sand-50 text-sand-600',
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
      const params = {};
      if (search) params.name = search;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/suppliers', { params });
      setSuppliers(res.data);
    } catch { toast.error('Failed to load suppliers'); }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const openAdd = () => { setForm(empty); setModal('add'); };
  const openEdit = (s) => { setForm(s); setSelected(s); setModal('edit'); };
  const openPay = (s) => { setSelected(s); setPayForm({ amount: '', note: '' }); setModal('pay'); };
  const openHistory = (s) => { setSelected(s); setModal('history'); };
  const openDelete = (s) => { setSelected(s); setModal('delete'); };
  const closeModal = () => { setModal(null); setSelected(null); };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (modal === 'add') await api.post('/suppliers', form);
      else await api.put(`/suppliers/${selected._id}`, form);
      toast.success(modal === 'add' ? 'Supplier added' : 'Updated');
      closeModal(); fetchSuppliers();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const handlePay = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post(`/suppliers/${selected._id}/pay`, payForm);
      toast.success('Payment recorded');
      closeModal(); fetchSuppliers();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try { await api.delete(`/suppliers/${selected._id}`); toast.success('Removed'); closeModal(); fetchSuppliers(); }
    catch { toast.error('Error'); } finally { setSaving(false); }
  };

  const statusOpts = [{ value: 'paid', label: 'Paid' }, { value: 'partial', label: 'Partial' }, { value: 'unpaid', label: 'Unpaid' }];
  const totalOwed = suppliers.reduce((s, sup) => s + (sup.remainingAmount || 0), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <div className="card px-4 py-2.5 flex items-center gap-2">
            <span className="text-sand-400 text-xs uppercase tracking-wide">Vendors</span>
            <span className="text-atelier-dark font-semibold">{suppliers.length} suppliers</span>
          </div>
          <div className="card px-4 py-2.5 flex items-center gap-2">
            <span className="text-sand-400 text-xs uppercase tracking-wide">Owed</span>
            <span className="text-red-600 font-semibold">{fmt(totalOwed)} MAD</span>
          </div>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Add Supplier
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3">
        <div className="w-full sm:flex-1 sm:min-w-[200px]">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by name..." />
        </div>
        <div className="flex flex-wrap gap-1 bg-sand-100 p-1 rounded-xl">
          {[{ value: '', label: 'All' }, ...statusOpts].map(o => (
            <button key={o.value} onClick={() => setStatusFilter(o.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === o.value ? 'bg-white shadow-warm-xs text-atelier-dark' : 'text-sand-500 hover:text-sand-700'}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards grid */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-sand-200 border-t-bronze-400 rounded-full animate-spin" /></div>
      ) : suppliers.length === 0 ? (
        <div className="text-center py-16 text-sand-400"><p className="text-3xl mb-2">🪵</p><p className="text-sm">No suppliers found</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {suppliers.map((s) => (
            <div key={s._id} className="card p-5 card-hover">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sand-100 flex items-center justify-center text-sand-600 font-semibold text-sm">
                    {s.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-atelier-dark text-sm">{s.name}</p>
                    <p className="text-xs text-sand-400">{s.phone || 'No phone'}</p>
                  </div>
                </div>
                <StatusBadge status={s.paymentStatus} />
              </div>

              {/* Product / category */}
              <div className="flex items-center gap-2 mb-4">
                {s.product && (
                  <span className="text-xs bg-sand-100 text-sand-600 px-2.5 py-1 rounded-lg font-medium">{s.product}</span>
                )}
                {s.category && (
                  <span className={`text-xs px-2.5 py-1 rounded-lg font-medium capitalize ${categoryColors[s.category?.toLowerCase()] || categoryColors.other}`}>
                    {s.category}
                  </span>
                )}
              </div>

              {/* Progress bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-sand-400 mb-1.5">
                  <span>Payment progress</span>
                  <span>{s.totalAmount > 0 ? Math.round((s.paidAmount / s.totalAmount) * 100) : 0}%</span>
                </div>
                <div className="h-1.5 bg-sand-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-bronze-400 rounded-full transition-all"
                    style={{ width: `${s.totalAmount > 0 ? Math.min(100, (s.paidAmount / s.totalAmount) * 100) : 0}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center mb-4">
                {[
                  { label: 'Total', value: fmt(s.totalAmount) },
                  { label: 'Paid', value: fmt(s.paidAmount) },
                  { label: 'Remaining', value: fmt(s.remainingAmount), red: s.remainingAmount > 0 },
                ].map(stat => (
                  <div key={stat.label} className="bg-sand-50 rounded-xl p-2.5">
                    <p className="text-xs text-sand-400">{stat.label}</p>
                    <p className={`text-sm font-semibold mt-0.5 ${stat.red ? 'text-red-600' : 'text-atelier-dark'}`}>{stat.value}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button onClick={() => openPay(s)} className="btn-primary btn-sm flex-1 justify-center">Pay</button>
                <button onClick={() => openHistory(s)} className="btn-secondary btn-sm flex-1 justify-center">History</button>
                <button onClick={() => openEdit(s)} className="btn-secondary btn-sm px-3">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
                </button>
                <button onClick={() => openDelete(s)} className="btn-ghost btn-sm text-red-400 hover:text-red-600 hover:bg-red-50">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit */}
      <Modal isOpen={modal === 'add' || modal === 'edit'} onClose={closeModal} title={modal === 'add' ? 'Add Supplier' : 'Edit Supplier'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Supplier Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            <FormInput label="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <FormInput label="Product / Material" value={form.product} onChange={e => setForm({ ...form, product: e.target.value })} placeholder="e.g. Oak wood, Linen fabric..." />
            <FormInput label="Category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="e.g. Wood, Fabric, Metal..." />
            <FormInput label="Total Amount (MAD)" type="number" value={form.totalAmount} onChange={e => setForm({ ...form, totalAmount: e.target.value })} />
            <FormInput label="Already Paid (MAD)" type="number" value={form.paidAmount} onChange={e => setForm({ ...form, paidAmount: e.target.value })} />
          </div>
          <FormInput label="Notes" type="textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </Modal>

      {/* Pay */}
      <Modal isOpen={modal === 'pay'} onClose={closeModal} title={`Pay ${selected?.name}`} size="sm">
        <div className="mb-4 p-4 bg-sand-50 rounded-xl border border-sand-200">
          <div className="flex justify-between text-sm mb-1"><span className="text-sand-500">Total amount</span><span className="font-medium">{fmt(selected?.totalAmount)} MAD</span></div>
          <div className="flex justify-between text-sm mb-1"><span className="text-sand-500">Already paid</span><span className="font-medium">{fmt(selected?.paidAmount)} MAD</span></div>
          <div className="flex justify-between text-sm font-semibold border-t border-sand-200 pt-2 mt-2">
            <span>Remaining</span><span className="text-red-600">{fmt(selected?.remainingAmount)} MAD</span>
          </div>
        </div>
        <form onSubmit={handlePay} className="space-y-4">
          <FormInput label="Amount to Pay (MAD)" type="number" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} required min="1" />
          <FormInput label="Note (optional)" value={payForm.note} onChange={e => setPayForm({ ...payForm, note: e.target.value })} />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Processing...' : 'Confirm Payment'}</button>
          </div>
        </form>
      </Modal>

      {/* Payment History */}
      <Modal isOpen={modal === 'history'} onClose={closeModal} title={`Payment History — ${selected?.name}`}>
        {!selected?.paymentHistory?.length ? (
          <div className="text-center py-10 text-sand-400">
            <p className="text-2xl mb-2">💳</p>
            <p className="text-sm">No payments recorded yet</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {selected.paymentHistory.map((h, i) => (
              <div key={i} className="flex items-center justify-between p-3.5 bg-sand-50 rounded-xl border border-sand-100">
                <div>
                  <p className="text-sm font-semibold text-atelier-dark">{fmt(h.amount)} MAD</p>
                  {h.note && <p className="text-xs text-sand-500 mt-0.5">{h.note}</p>}
                </div>
                <p className="text-xs text-sand-400">{new Date(h.date).toLocaleDateString('fr-MA')}</p>
              </div>
            ))}
            <div className="pt-2 border-t border-sand-200 flex justify-between text-sm font-semibold">
              <span className="text-sand-600">Total paid</span>
              <span className="text-atelier-dark">{fmt(selected?.paidAmount)} MAD</span>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={modal === 'delete'} onClose={closeModal} onConfirm={handleDelete} loading={saving}
        title="Remove Supplier" message={`Remove "${selected?.name}" from your supplier list?`} />
    </div>
  );
};

export default Suppliers;

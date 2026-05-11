import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Receipt, Plus, Printer, Clock } from 'lucide-react';
import api from '../api';
import Modal from '../components/ui/Modal';
import FormInput from '../components/ui/FormInput';
import StatusBadge from '../components/ui/StatusBadge';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { printInvoice } from '../utils/print';

const fmt = (n) => new Intl.NumberFormat('fr-MA').format(n ?? 0);

const emptyItem = { description: '', quantity: '', unitPrice: 0 };
const emptyForm = { client: '', items: [{ ...emptyItem }], laborCost: 0, dueDate: '', notes: '' };

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.paymentStatus = statusFilter;
      const res = await api.get('/invoices', { params });
      setInvoices(res.data);
    } catch { toast.error('Failed to load invoices'); }
    finally { setLoading(false); }
  }, [statusFilter]);

  const fetchClients = useCallback(async () => {
    try {
      const res = await api.get('/clients', { params: { limit: 500 } });
      setClients(res.data.clients || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);
  useEffect(() => { fetchClients(); }, [fetchClients]);

  const openAdd = () => { setForm(emptyForm); setModal('add'); };
  const openView = async (inv) => {
    try {
      const res = await api.get(`/invoices/${inv._id}`);
      setSelected(res.data); setModal('view');
    } catch { toast.error('Failed to load invoice'); }
  };
  const openPay = (inv) => { setSelected(inv); setPayAmount(''); setPayNote(''); setModal('pay'); };
  const openDelete = (inv) => { setSelected(inv); setModal('delete'); };
  const closeModal = () => { setModal(null); setSelected(null); };

  const setItem = (i, field, val) => {
    const items = [...form.items];
    items[i] = { ...items[i], [field]: val };
    setForm({ ...form, items });
  };
  const addItem = () => setForm({ ...form, items: [...form.items, { ...emptyItem }] });
  const removeItem = (i) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/invoices', form);
      toast.success('Invoice created');
      closeModal(); fetchInvoices();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const handlePay = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post(`/invoices/${selected._id}/pay`, { amount: payAmount, note: payNote });
      toast.success('Payment recorded');
      closeModal(); fetchInvoices();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try { await api.delete(`/invoices/${selected._id}`); toast.success('Invoice deleted'); closeModal(); fetchInvoices(); }
    catch { toast.error('Error'); } finally { setSaving(false); }
  };

  const liveTotal = form.items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0) + (Number(form.laborCost) || 0);
  const totalRevenue = invoices.reduce((s, i) => s + i.paidAmount, 0);
  const totalPending = invoices.reduce((s, i) => s + i.remainingAmount, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <div className="card px-4 py-2.5 flex items-center gap-2">
            <span className="text-sand-400 text-xs uppercase tracking-wide">Total</span>
            <span className="text-atelier-dark font-semibold">{invoices.length} invoices</span>
          </div>
          <div className="card px-4 py-2.5 flex items-center gap-2">
            <span className="text-sand-400 text-xs uppercase tracking-wide">Collected</span>
            <span className="text-emerald-700 font-semibold">{fmt(totalRevenue)} MAD</span>
          </div>
          <div className="card px-4 py-2.5 flex items-center gap-2">
            <span className="text-sand-400 text-xs uppercase tracking-wide">Pending</span>
            <span className="text-red-600 font-semibold">{fmt(totalPending)} MAD</span>
          </div>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus className="w-4 h-4" strokeWidth={2} />
          New Invoice
        </button>
      </div>

      {/* Filter */}
      <div className="card p-4">
        <div className="flex gap-1 bg-sand-100 p-1 rounded-xl flex-wrap">
          {[{ value: '', label: 'All' }, { value: 'unpaid', label: 'Unpaid' }, { value: 'partial', label: 'Partial' }, { value: 'paid', label: 'Paid' }].map(o => (
            <button key={o.value} onClick={() => setStatusFilter(o.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === o.value ? 'bg-white shadow-warm-xs text-atelier-dark' : 'text-sand-500 hover:text-sand-700'}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-sand-200 border-t-bronze-400 rounded-full animate-spin" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-2xl bg-sand-100 flex items-center justify-center mx-auto mb-3">
            <Receipt className="w-6 h-6 text-sand-300" strokeWidth={1.5} />
          </div>
          <p className="text-[13px] text-sand-400">No invoices yet</p>
        </div>
      ) : (
        <>
          {/* Mobile card list */}
          <div className="sm:hidden space-y-3">
            {invoices.map(inv => (
              <div key={inv._id} className="card p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-mono text-[11px] text-sand-400">{inv.invoiceNumber}</p>
                    <p className="font-medium text-atelier-dark text-sm mt-0.5">{inv.client?.fullName || '—'}</p>
                  </div>
                  <StatusBadge status={inv.paymentStatus} />
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-sand-50 rounded-xl p-2.5 text-center">
                    <p className="text-[10px] text-sand-400 mb-0.5">Total</p>
                    <p className="text-xs font-semibold text-atelier-dark">{fmt(inv.totalAmount)}</p>
                  </div>
                  <div className="bg-sand-50 rounded-xl p-2.5 text-center">
                    <p className="text-[10px] text-sand-400 mb-0.5">Paid</p>
                    <p className="text-xs font-semibold text-emerald-700">{fmt(inv.paidAmount)}</p>
                  </div>
                  <div className="bg-sand-50 rounded-xl p-2.5 text-center">
                    <p className="text-[10px] text-sand-400 mb-0.5">Remaining</p>
                    <p className={`text-xs font-semibold ${inv.remainingAmount > 0 ? 'text-red-600' : 'text-sand-400'}`}>{fmt(inv.remainingAmount)}</p>
                  </div>
                </div>
                <p className="text-[11px] text-sand-400 mb-3">{new Date(inv.createdAt).toLocaleDateString('fr-MA')}</p>
                <div className="flex gap-2 pt-3 border-t border-sand-100">
                  <button onClick={() => openView(inv)} className="btn-secondary btn-sm flex-1 justify-center h-8">View</button>
                  {inv.paymentStatus !== 'paid' && (
                    <button onClick={() => openPay(inv)} className="btn-primary btn-sm flex-1 justify-center h-8">Pay</button>
                  )}
                  <button onClick={() => openDelete(inv)} className="btn-ghost btn-sm h-8 w-8 justify-center p-0 text-red-400 hover:text-red-600 hover:bg-red-50">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block card overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-sand-100 bg-sand-50">
                  {['Invoice #', 'Client', 'Total', 'Paid', 'Remaining', 'Status', 'Date', ''].map(h => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv._id} className="table-row">
                    <td className="table-td font-mono text-[12px] font-medium text-atelier-dark">{inv.invoiceNumber}</td>
                    <td className="table-td font-medium">{inv.client?.fullName || '—'}</td>
                    <td className="table-td font-semibold">{fmt(inv.totalAmount)} MAD</td>
                    <td className="table-td text-emerald-700 font-medium">{fmt(inv.paidAmount)} MAD</td>
                    <td className="table-td">
                      <span className={inv.remainingAmount > 0 ? 'text-red-600 font-medium' : 'text-sand-400'}>
                        {fmt(inv.remainingAmount)} MAD
                      </span>
                    </td>
                    <td className="table-td"><StatusBadge status={inv.paymentStatus} /></td>
                    <td className="table-td text-sand-500 text-[12px]">{new Date(inv.createdAt).toLocaleDateString('fr-MA')}</td>
                    <td className="table-td">
                      <div className="flex gap-1.5 justify-end">
                        <button onClick={() => openView(inv)} className="btn-secondary btn-sm" title="View">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </button>
                        {inv.paymentStatus !== 'paid' && (
                          <button onClick={() => openPay(inv)} className="btn-primary btn-sm" title="Record Payment">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75" /></svg>
                          </button>
                        )}
                        <button onClick={() => openDelete(inv)} className="btn-ghost btn-sm text-red-400 hover:text-red-600 hover:bg-red-50">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </>
      )}

      {/* Create Invoice Modal */}
      <Modal isOpen={modal === 'add'} onClose={closeModal} title="New Invoice" size="xl">
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-1">
              <label className="label">Client</label>
              <select className="input" value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} required>
                <option value="">Select client...</option>
                {clients.map(c => <option key={c._id} value={c._id}>{c.fullName}</option>)}
              </select>
            </div>
            <FormInput label="Due Date" type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
            <FormInput label="Labor Cost (MAD)" type="number" value={form.laborCost} onChange={e => setForm({ ...form, laborCost: e.target.value })} min="0" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="label mb-0">Line Items</label>
              <button type="button" onClick={addItem} className="btn-secondary btn-sm">
                <Plus className="w-3.5 h-3.5" strokeWidth={2} /> Add Line
              </button>
            </div>
            <div className="space-y-2">
              {form.items.map((item, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_70px_100px_32px] gap-2 items-center">
                  <input className="input" placeholder="Description" value={item.description} onChange={e => setItem(i, 'description', e.target.value)} required />
                  <div className="flex gap-2 sm:contents">
                    <input className="input flex-1 sm:flex-none" type="number" placeholder="Qty" value={item.quantity} onChange={e => setItem(i, 'quantity', e.target.value)} min="0" />
                    <input className="input flex-[2] sm:flex-none" type="number" placeholder="Unit (MAD)" value={item.unitPrice} onChange={e => setItem(i, 'unitPrice', e.target.value)} min="0" />
                    {form.items.length > 1 && (
                      <button type="button" onClick={() => removeItem(i)} className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between px-1">
              <span className="text-[11px] text-sand-400">Total</span>
              <span className="text-[14px] font-semibold text-atelier-dark">{fmt(liveTotal)} MAD</span>
            </div>
          </div>

          <FormInput label="Notes" type="textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Creating...' : 'Create Invoice'}</button>
          </div>
        </form>
      </Modal>

      {/* View Invoice Modal */}
      <Modal isOpen={modal === 'view'} onClose={closeModal} title={`Invoice — ${selected?.invoiceNumber}`} size="lg">
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Client', value: selected.client?.fullName || '—' },
                { label: 'Status', value: <StatusBadge status={selected.paymentStatus} /> },
                { label: 'Issued', value: new Date(selected.createdAt).toLocaleDateString('fr-MA') },
                { label: 'Due Date', value: selected.dueDate ? new Date(selected.dueDate).toLocaleDateString('fr-MA') : '—' },
              ].map(f => (
                <div key={f.label} className="bg-sand-50 rounded-xl p-3">
                  <p className="text-[10px] text-sand-400 uppercase tracking-wide mb-1">{f.label}</p>
                  <div className="text-[13px] font-medium text-atelier-dark">{f.value}</div>
                </div>
              ))}
            </div>

            <div className="border border-sand-200 rounded-xl overflow-hidden">
              <div className="grid grid-cols-4 bg-sand-50 text-[10px] font-semibold text-sand-500 uppercase tracking-wide">
                <div className="px-4 py-3 col-span-2">Description</div>
                <div className="px-4 py-3 text-center">Qty</div>
                <div className="px-4 py-3 text-right">Total</div>
              </div>
              {selected.items?.map((item, i) => (
                <div key={i} className="grid grid-cols-4 border-t border-sand-100">
                  <div className="px-4 py-3 text-[13px] col-span-2">{item.description}</div>
                  <div className="px-4 py-3 text-[13px] text-center text-sand-500">{item.quantity || '—'}</div>
                  <div className="px-4 py-3 text-[13px] text-right font-medium">{fmt((Number(item.quantity) || 0) * item.unitPrice)} MAD</div>
                </div>
              ))}
            </div>

            <div className="bg-sand-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-[13px]"><span className="text-sand-500">Total</span><span className="font-semibold">{fmt(selected.totalAmount)} MAD</span></div>
              <div className="flex justify-between text-[13px]"><span className="text-sand-500">Paid</span><span className="text-emerald-700 font-semibold">{fmt(selected.paidAmount)} MAD</span></div>
              <div className="flex justify-between text-[15px] font-bold border-t border-sand-200 pt-2">
                <span>Remaining</span><span className={selected.remainingAmount > 0 ? 'text-red-600' : 'text-emerald-700'}>{fmt(selected.remainingAmount)} MAD</span>
              </div>
            </div>

            {selected.paymentHistory?.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-sand-500 uppercase tracking-wider mb-2">Payment History</p>
                <div className="card overflow-hidden">
                  {selected.paymentHistory.map((p, i) => (
                    <div key={i} className={`flex items-center gap-4 px-4 py-3 ${i !== 0 ? 'border-t border-sand-100' : ''}`}>
                      <Clock className="w-4 h-4 text-sand-400 shrink-0" strokeWidth={1.5} />
                      <div className="flex-1">
                        <p className="text-[12px] text-sand-600">{p.note || 'Payment'}</p>
                        <p className="text-[11px] text-sand-400">{new Date(p.date).toLocaleDateString('fr-MA')}</p>
                      </div>
                      <p className="text-[13px] font-semibold text-emerald-700">+{fmt(p.amount)} MAD</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 justify-end pt-2">
              <button onClick={() => printInvoice(selected)} className="btn-secondary">
                <Printer className="w-4 h-4" strokeWidth={1.5} />
                Print / PDF
              </button>
              {selected.paymentStatus !== 'paid' && (
                <button onClick={() => { closeModal(); openPay(selected); }} className="btn-primary">Record Payment</button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Pay Modal */}
      <Modal isOpen={modal === 'pay'} onClose={closeModal} title={`Payment — ${selected?.invoiceNumber}`} size="sm">
        <div className="mb-4 p-4 bg-sand-50 rounded-xl border border-sand-200 space-y-1.5">
          <div className="flex justify-between text-[13px]"><span className="text-sand-500">Invoice total</span><span className="font-medium">{fmt(selected?.totalAmount)} MAD</span></div>
          <div className="flex justify-between text-[13px]"><span className="text-sand-500">Already paid</span><span className="text-emerald-700 font-medium">{fmt(selected?.paidAmount)} MAD</span></div>
          <div className="flex justify-between text-[13px] font-bold border-t border-sand-200 pt-2 mt-1">
            <span>Remaining</span><span className="text-red-600">{fmt(selected?.remainingAmount)} MAD</span>
          </div>
        </div>
        <form onSubmit={handlePay} className="space-y-4">
          <FormInput label="Amount (MAD)" type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} required min="1" max={selected?.remainingAmount} />
          <FormInput label="Note (optional)" value={payNote} onChange={e => setPayNote(e.target.value)} />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Processing...' : 'Record Payment'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={modal === 'delete'} onClose={closeModal} onConfirm={handleDelete} loading={saving}
        title="Delete Invoice" message={`Delete invoice "${selected?.invoiceNumber}"?`} />
    </div>
  );
};

export default Invoices;

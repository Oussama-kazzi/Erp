import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { ClipboardList, Plus, Pencil, Trash2, CreditCard } from 'lucide-react';
import api from '../api';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import SearchInput from '../components/ui/SearchInput';
import FormInput from '../components/ui/FormInput';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const fmt = (n) => new Intl.NumberFormat('fr-MA').format(n ?? 0);

const emptyOrder = {
  client: '',
  clientName: '', clientPhone: '',
  items: [{ name: '', quantity: 1, unitPrice: 0 }],
  advancePayment: 0, status: 'pending',
  orderDate: new Date().toISOString().split('T')[0],
  deliveryDate: '', notes: '',
  fabricType: '', color: '', dimensions: '', weight: '', laborCost: 0,
};

const stageConfig = {
  pending:       { label: 'Pending',       color: 'text-sand-600',    bg: 'bg-sand-100',    dot: 'bg-sand-400',    step: 1 },
  in_production: { label: 'In Production', color: 'text-blue-700',    bg: 'bg-blue-50',     dot: 'bg-blue-500',    step: 2 },
  in_progress:   { label: 'In Progress',   color: 'text-violet-700',  bg: 'bg-violet-50',   dot: 'bg-violet-500',  step: 3 },
  finished:      { label: 'Finished',      color: 'text-teal-700',    bg: 'bg-teal-50',     dot: 'bg-teal-500',    step: 4 },
  ready:         { label: 'Ready',         color: 'text-emerald-700', bg: 'bg-emerald-50',  dot: 'bg-emerald-500', step: 5 },
  delivered:     { label: 'Delivered',     color: 'text-atelier-dark',bg: 'bg-sand-100',    dot: 'bg-atelier-dark',step: 6 },
  cancelled:     { label: 'Cancelled',     color: 'text-red-600',     bg: 'bg-red-50',      dot: 'bg-red-400',     step: 0 },
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyOrder);
  const [saving, setSaving] = useState(false);
  const [payAmount, setPayAmount] = useState('');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.client = search;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/orders', { params });
      setOrders(res.data);
    } catch { toast.error('Failed to load orders'); }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  const fetchClients = useCallback(async () => {
    try {
      const res = await api.get('/clients');
      setClients(res.data.clients || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => { fetchClients(); }, [fetchClients]);

  const openAdd = () => { setForm(emptyOrder); setModal('add'); };
  const openEdit = (o) => {
    setForm({
      ...emptyOrder, ...o,
      client: o.client?._id || o.client || '',
      orderDate: o.orderDate?.split('T')[0] || '',
      deliveryDate: o.deliveryDate?.split('T')[0] || '',
    });
    setSelected(o); setModal('edit');
  };
  const openView = (o) => { setSelected(o); setModal('view'); };
  const openPay = (o) => { setSelected(o); setPayAmount(''); setModal('pay'); };
  const openDelete = (o) => { setSelected(o); setModal('delete'); };
  const closeModal = () => { setModal(null); setSelected(null); };

  const handleClientSelect = (clientId) => {
    if (!clientId) { setForm(f => ({ ...f, client: '', clientName: '', clientPhone: '' })); return; }
    const c = clients.find(cl => cl._id === clientId);
    if (c) setForm(f => ({ ...f, client: clientId, clientName: c.fullName, clientPhone: c.phone || '' }));
  };

  const setItem = (i, field, val) => {
    const items = [...form.items];
    items[i] = { ...items[i], [field]: val };
    setForm({ ...form, items });
  };
  const addItem = () => setForm({ ...form, items: [...form.items, { name: '', quantity: 1, unitPrice: 0 }] });
  const removeItem = (i) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });

  const itemsTotal = form.items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0);
  const formTotal = itemsTotal + (Number(form.laborCost) || 0);

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.client) delete payload.client;
      if (modal === 'add') await api.post('/orders', payload);
      else await api.put(`/orders/${selected._id}`, payload);
      toast.success(modal === 'add' ? 'Order created' : 'Order updated');
      closeModal(); fetchOrders();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const handlePay = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post(`/orders/${selected._id}/pay`, { amount: payAmount });
      toast.success('Payment recorded');
      closeModal(); fetchOrders();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try { await api.delete(`/orders/${selected._id}`); toast.success('Order removed'); closeModal(); fetchOrders(); }
    catch { toast.error('Error'); } finally { setSaving(false); }
  };

  const statusOpts = Object.entries(stageConfig).map(([value, cfg]) => ({ value, label: cfg.label }));
  const activeCount = orders.filter(o => ['in_production', 'in_progress'].includes(o.status)).length;
  const totalRevenue = orders.reduce((s, o) => s + (o.totalPrice || 0), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <div className="card px-4 py-2.5 flex items-center gap-2">
            <span className="text-sand-400 text-xs uppercase tracking-wide">Orders</span>
            <span className="text-atelier-dark font-semibold">{orders.length} total</span>
          </div>
          <div className="card px-4 py-2.5 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-sand-400 text-xs uppercase tracking-wide">Active</span>
            <span className="text-atelier-dark font-semibold">{activeCount}</span>
          </div>
          <div className="card px-4 py-2.5 flex items-center gap-2">
            <span className="text-sand-400 text-xs uppercase tracking-wide">Revenue</span>
            <span className="text-atelier-dark font-semibold">{fmt(totalRevenue)} MAD</span>
          </div>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus className="w-4 h-4" strokeWidth={2} />
          New Order
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3">
        <div className="w-full sm:flex-1 sm:min-w-[200px]">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by client..." />
        </div>
        <div className="flex gap-1 bg-sand-100 p-1 rounded-xl flex-wrap">
          {[{ value: '', label: 'All' }, ...statusOpts].map(o => (
            <button key={o.value} onClick={() => setStatusFilter(o.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === o.value ? 'bg-white shadow-warm-xs text-atelier-dark' : 'text-sand-500 hover:text-sand-700'}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-sand-200 border-t-bronze-400 rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-2xl bg-sand-100 flex items-center justify-center mx-auto mb-3">
            <ClipboardList className="w-6 h-6 text-sand-300" strokeWidth={1.5} />
          </div>
          <p className="text-[13px] text-sand-400">No orders found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orders.map((o) => {
            const stage = stageConfig[o.status] || stageConfig.pending;
            const pct = o.totalPrice > 0 ? Math.min(100, Math.round((o.advancePayment / o.totalPrice) * 100)) : 0;
            return (
              <div key={o._id} className="card p-5 card-hover flex flex-col">
                {/* Top: client info, status badge, fabric tags, items, dates */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium text-atelier-dark text-sm">{o.clientName}</p>
                      <p className="text-xs text-sand-400 mt-0.5">{o.clientPhone || 'No phone'}</p>
                    </div>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${stage.bg} ${stage.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${stage.dot}`} />
                      {stage.label}
                    </div>
                  </div>

                  {/* Fabric details */}
                  {(o.fabricType || o.color) && (
                    <div className="flex gap-2 mb-3 flex-wrap">
                      {o.fabricType && <span className="px-2 py-0.5 rounded-md bg-sand-100 text-sand-600 text-[11px]">{o.fabricType}</span>}
                      {o.color && <span className="px-2 py-0.5 rounded-md bg-sand-100 text-sand-600 text-[11px]">{o.color}</span>}
                    </div>
                  )}

                  {/* Items preview */}
                  <div className="space-y-1">
                    {o.items?.slice(0, 2).map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-xs text-sand-600 bg-sand-50 px-3 py-1.5 rounded-lg">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-sand-400">×{item.quantity}</span>
                      </div>
                    ))}
                    {o.items?.length > 2 && <p className="text-xs text-sand-400 pl-3">+{o.items.length - 2} more</p>}
                  </div>
                </div>

                {/* Bottom: dates + payment progress + totals + actions — always pinned */}
                <div className="mt-4">
                  {/* Dates */}
                  {(o.orderDate || o.deliveryDate) && (
                    <div className="flex items-center gap-3 mb-3 text-xs text-sand-400">
                      {o.orderDate && <span>Ordered {new Date(o.orderDate).toLocaleDateString('fr-MA')}</span>}
                      {o.deliveryDate && (
                        <><span className="text-sand-200">→</span><span>Due {new Date(o.deliveryDate).toLocaleDateString('fr-MA')}</span></>
                      )}
                    </div>
                  )}

                  {/* Payment progress */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-sand-400 mb-1.5">
                      <span>Advance received</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-sand-100 rounded-full overflow-hidden">
                      <div className="h-full bg-bronze-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="grid grid-cols-3 gap-2 text-center mb-4">
                    {[
                      { label: 'Total', value: fmt(o.totalPrice) },
                      { label: 'Advance', value: fmt(o.advancePayment) },
                      { label: 'Remaining', value: fmt(o.remainingAmount), red: o.remainingAmount > 0 },
                    ].map(s => (
                      <div key={s.label} className="bg-sand-50 rounded-xl p-2.5">
                        <p className="text-xs text-sand-400">{s.label}</p>
                        <p className={`text-sm font-semibold mt-0.5 ${s.red ? 'text-red-600' : 'text-atelier-dark'}`}>{s.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-sand-100 flex gap-2 items-center">
                    <button onClick={() => openView(o)} className="btn-secondary btn-sm flex-1 justify-center h-8">Details</button>
                    <button onClick={() => openPay(o)} className="btn-primary btn-sm flex-1 justify-center h-8">
                      <CreditCard className="w-3.5 h-3.5" strokeWidth={1.5} /> Pay
                    </button>
                    <button onClick={() => openEdit(o)} className="btn-secondary btn-sm h-8 w-8 justify-center p-0">
                      <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                    <button onClick={() => openDelete(o)} className="btn-ghost btn-sm text-red-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 justify-center p-0">
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={modal === 'add' || modal === 'edit'} onClose={closeModal} title={modal === 'add' ? 'New Order' : 'Edit Order'} size="lg">
        <form onSubmit={handleSave} className="space-y-5">
          {/* Client selector */}
          <div>
            <label className="label">Client</label>
            <select
              className="input"
              value={form.client || ''}
              onChange={e => handleClientSelect(e.target.value)}
            >
              <option value="">— Select a client or type manually —</option>
              {clients.map(c => <option key={c._id} value={c._id}>{c.fullName}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Client Name" value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value, client: '' })} required />
            <FormInput label="Client Phone" value={form.clientPhone} onChange={e => setForm({ ...form, clientPhone: e.target.value })} />
            <FormInput label="Order Date" type="date" value={form.orderDate} onChange={e => setForm({ ...form, orderDate: e.target.value })} />
            <FormInput label="Delivery Date" type="date" value={form.deliveryDate} onChange={e => setForm({ ...form, deliveryDate: e.target.value })} />
            <div>
              <label className="label">Production Stage</label>
              <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {statusOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <FormInput label="Advance Payment (MAD)" type="number" value={form.advancePayment} onChange={e => setForm({ ...form, advancePayment: e.target.value })} />
          </div>

          {/* Fabric / Material Details */}
          <div>
            <p className="text-[11px] font-semibold text-sand-500 uppercase tracking-wider mb-3">Material Details</p>
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Fabric Type" value={form.fabricType} onChange={e => setForm({ ...form, fabricType: e.target.value })} placeholder="e.g. Velvet, Linen..." />
              <FormInput label="Color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} placeholder="e.g. Beige, Dark Grey..." />
              <FormInput label="Dimensions" value={form.dimensions} onChange={e => setForm({ ...form, dimensions: e.target.value })} placeholder="e.g. 200×90×80 cm" />
              <FormInput label="Weight (kg)" type="number" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} placeholder="0" />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="label mb-0">Order Items</label>
              <button type="button" onClick={addItem} className="btn-secondary btn-sm">
                <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                Add Item
              </button>
            </div>
            <div className="space-y-2">
              {form.items.map((item, i) => (
                <div key={i} className="grid grid-cols-[1fr_60px_90px_32px] sm:grid-cols-[1fr_80px_110px_32px] gap-2 items-center">
                  <input className="input" placeholder="Item description" value={item.name} onChange={e => setItem(i, 'name', e.target.value)} required />
                  <input className="input" type="number" placeholder="Qty" value={item.quantity} onChange={e => setItem(i, 'quantity', e.target.value)} min="1" />
                  <input className="input" type="number" placeholder="Unit (MAD)" value={item.unitPrice} onChange={e => setItem(i, 'unitPrice', e.target.value)} min="0" />
                  {form.items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)} className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 p-3 bg-sand-50 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-xs text-sand-500">
                <span>Items subtotal</span>
                <span className="font-medium text-atelier-dark">{fmt(itemsTotal)} MAD</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-sand-500 whitespace-nowrap">Labor cost (MAD)</span>
                <input className="input h-8 text-xs flex-1" type="number" placeholder="0" value={form.laborCost} onChange={e => setForm({ ...form, laborCost: e.target.value })} min="0" />
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-atelier-dark border-t border-sand-200 pt-1.5">
                <span>Order total</span>
                <span>{fmt(formTotal)} MAD</span>
              </div>
            </div>
          </div>

          <FormInput label="Notes" type="textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Order'}</button>
          </div>
        </form>
      </Modal>

      {/* View */}
      <Modal isOpen={modal === 'view'} onClose={closeModal} title={`Order — ${selected?.clientName}`} size="md">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Client', value: selected.clientName },
                { label: 'Phone', value: selected.clientPhone || '—' },
                { label: 'Order Date', value: selected.orderDate ? new Date(selected.orderDate).toLocaleDateString('fr-MA') : '—' },
                { label: 'Delivery Date', value: selected.deliveryDate ? new Date(selected.deliveryDate).toLocaleDateString('fr-MA') : '—' },
                ...(selected.fabricType ? [{ label: 'Fabric', value: selected.fabricType }] : []),
                ...(selected.color ? [{ label: 'Color', value: selected.color }] : []),
                ...(selected.dimensions ? [{ label: 'Dimensions', value: selected.dimensions }] : []),
                ...(selected.weight ? [{ label: 'Weight', value: `${selected.weight} kg` }] : []),
              ].map(f => (
                <div key={f.label} className="bg-sand-50 rounded-xl p-3">
                  <p className="text-xs text-sand-400 mb-1">{f.label}</p>
                  <p className="text-sm font-medium text-atelier-dark">{f.value}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <StatusBadge status={selected.status} />
              <StatusBadge status={selected.paymentStatus} />
            </div>

            <div className="border border-sand-200 rounded-xl overflow-hidden">
              <div className="bg-sand-50 grid grid-cols-4 text-xs font-medium text-sand-500 uppercase tracking-wide">
                <div className="px-4 py-3">Item</div>
                <div className="px-4 py-3 text-center">Qty</div>
                <div className="px-4 py-3 text-right">Unit</div>
                <div className="px-4 py-3 text-right">Total</div>
              </div>
              {selected.items?.map((item, i) => (
                <div key={i} className="grid grid-cols-4 border-t border-sand-100">
                  <div className="px-4 py-3 text-sm text-atelier-dark">{item.name}</div>
                  <div className="px-4 py-3 text-sm text-center text-sand-600">{item.quantity}</div>
                  <div className="px-4 py-3 text-sm text-right text-sand-600">{fmt(item.unitPrice)}</div>
                  <div className="px-4 py-3 text-sm text-right font-medium text-atelier-dark">{fmt(item.quantity * item.unitPrice)}</div>
                </div>
              ))}
            </div>

            <div className="bg-sand-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-sand-500">Items subtotal</span><span className="font-medium text-atelier-dark">{fmt(selected.totalPrice - (selected.laborCost || 0))} MAD</span></div>
              {selected.laborCost > 0 && <div className="flex justify-between text-sm"><span className="text-sand-500">Labor cost</span><span className="font-medium text-atelier-dark">{fmt(selected.laborCost)} MAD</span></div>}
              <div className="flex justify-between text-sm border-t border-sand-200 pt-2"><span className="text-sand-500">Order total</span><span className="font-semibold text-atelier-dark">{fmt(selected.totalPrice)} MAD</span></div>
              <div className="flex justify-between text-sm"><span className="text-sand-500">Advance paid</span><span className="font-semibold text-emerald-700">{fmt(selected.advancePayment)} MAD</span></div>
              <div className="flex justify-between text-sm font-semibold border-t border-sand-200 pt-2">
                <span>Remaining</span><span className="text-red-600">{fmt(selected.remainingAmount)} MAD</span>
              </div>
            </div>

            {selected.notes && (
              <div className="bg-sand-50 rounded-xl p-4">
                <p className="text-xs text-sand-400 mb-1">Notes</p>
                <p className="text-sm text-sand-700">{selected.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Pay */}
      <Modal isOpen={modal === 'pay'} onClose={closeModal} title={`Payment — ${selected?.clientName}`} size="sm">
        <div className="mb-4 p-4 bg-sand-50 rounded-xl border border-sand-200">
          <div className="flex justify-between text-sm mb-1"><span className="text-sand-500">Order total</span><span className="font-medium">{fmt(selected?.totalPrice)} MAD</span></div>
          <div className="flex justify-between text-sm mb-1"><span className="text-sand-500">Advance paid</span><span className="font-medium">{fmt(selected?.advancePayment)} MAD</span></div>
          <div className="flex justify-between text-sm font-semibold border-t border-sand-200 pt-2 mt-2">
            <span>Remaining</span><span className="text-red-600">{fmt(selected?.remainingAmount)} MAD</span>
          </div>
        </div>
        <form onSubmit={handlePay} className="space-y-4">
          <FormInput label="Amount to Record (MAD)" type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} required min="1" max={selected?.remainingAmount} />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Processing...' : 'Confirm Payment'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={modal === 'delete'} onClose={closeModal} onConfirm={handleDelete} loading={saving}
        title="Delete Order" message={`Remove the order for "${selected?.clientName}"? This cannot be undone.`} />
    </div>
  );
};

export default Orders;

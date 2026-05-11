import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { FileText, Plus, Printer, ArrowRight, Download, Eye, CheckCircle } from 'lucide-react';
import api from '../api';
import { useCompany } from '../context/CompanyContext';
import Modal from '../components/ui/Modal';
import FormInput from '../components/ui/FormInput';
import StatusBadge from '../components/ui/StatusBadge';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { downloadQuotePDF, previewQuotePDF, printQuotePDF } from '../utils/quotePDF';

const fmt = (n) => new Intl.NumberFormat('fr-MA').format(n ?? 0);

const emptyItem = { description: '', quantity: '', unitPrice: 0 };
const emptyForm = { client: '', items: [{ ...emptyItem }], laborCost: 0, status: 'draft', validUntil: '', notes: '' };

const STATUS_OPTS = ['draft', 'sent', 'accepted', 'rejected'];

const Quotes = () => {
  const { company } = useCompany();
  const [quotes, setQuotes] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [pdfQuote, setPdfQuote] = useState(null);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/quotes', { params });
      setQuotes(res.data);
    } catch { toast.error('Failed to load quotes'); }
    finally { setLoading(false); }
  }, [statusFilter]);

  const fetchClients = useCallback(async () => {
    try {
      const res = await api.get('/clients', { params: { limit: 500 } });
      setClients(res.data.clients || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchQuotes(); }, [fetchQuotes]);
  useEffect(() => { fetchClients(); }, [fetchClients]);

  const openAdd = () => { setForm(emptyForm); setModal('add'); };
  const openEdit = (q) => {
    setForm({
      ...q,
      client: q.client?._id || q.client || '',
      validUntil: q.validUntil ? q.validUntil.split('T')[0] : '',
    });
    setSelected(q); setModal('edit');
  };
  const openView = async (q) => {
    try {
      const res = await api.get(`/quotes/${q._id}`);
      setSelected(res.data); setModal('view');
    } catch { toast.error('Failed to load quote'); }
  };
  const openDelete = (q) => { setSelected(q); setModal('delete'); };
  const closeModal = () => { setModal(null); setSelected(null); if (modal !== 'pdf') setPdfQuote(null); };

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
      let saved;
      if (modal === 'add') {
        const res = await api.post('/quotes', form);
        saved = res.data;
      } else {
        const res = await api.put(`/quotes/${selected._id}`, form);
        saved = res.data;
      }
      toast.success(modal === 'add' ? 'Devis enregistré' : 'Devis mis à jour');
      closeModal();
      fetchQuotes();
      // Fetch full quote with client populated for the PDF
      setPdfGenerating(true);
      try {
        const full = await api.get(`/quotes/${saved._id}`);
        setPdfQuote(full.data);
        setModal('pdf');
      } catch { /* PDF optional, don't block */ }
      finally { setPdfGenerating(false); }
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const handleConvert = async (q) => {
    if (!window.confirm(`Convert quote ${q.quoteNumber} to invoice?`)) return;
    try {
      await api.post(`/quotes/${q._id}/convert`);
      toast.success('Converted to invoice');
      fetchQuotes();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try { await api.delete(`/quotes/${selected._id}`); toast.success('Quote deleted'); closeModal(); fetchQuotes(); }
    catch { toast.error('Error'); } finally { setSaving(false); }
  };

  const liveTotal = form.items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0) + (Number(form.laborCost) || 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <div className="card px-4 py-2.5 flex items-center gap-2">
            <span className="text-sand-400 text-xs uppercase tracking-wide">Total</span>
            <span className="text-atelier-dark font-semibold">{quotes.length} quotes</span>
          </div>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus className="w-4 h-4" strokeWidth={2} />
          New Quote
        </button>
      </div>

      {/* Status filter */}
      <div className="card p-4">
        <div className="flex gap-1 bg-sand-100 p-1 rounded-xl flex-wrap">
          {[{ value: '', label: 'All' }, ...STATUS_OPTS.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))].map(o => (
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
      ) : quotes.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-2xl bg-sand-100 flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6 text-sand-300" strokeWidth={1.5} />
          </div>
          <p className="text-[13px] text-sand-400">No quotes yet</p>
        </div>
      ) : (
        <>
          {/* Mobile card list */}
          <div className="sm:hidden space-y-3">
            {quotes.map(q => (
              <div key={q._id} className="card p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-mono text-[11px] text-sand-400">{q.quoteNumber}</p>
                    <p className="font-medium text-atelier-dark text-sm mt-0.5">{q.client?.fullName || '—'}</p>
                  </div>
                  <StatusBadge status={q.status} />
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-base font-semibold text-atelier-dark">{fmt(q.totalPrice)} <span className="text-xs font-normal text-sand-400">MAD</span></span>
                  <div className="text-right">
                    <p className="text-[10px] text-sand-400">
                      {q.validUntil ? `Valid until ${new Date(q.validUntil).toLocaleDateString('fr-MA')}` : new Date(q.createdAt).toLocaleDateString('fr-MA')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 pt-3 border-t border-sand-100">
                  <button onClick={() => openView(q)} className="btn-secondary btn-sm flex-1 justify-center h-8">View</button>
                  {q.status !== 'converted' && (
                    <button onClick={() => openEdit(q)} className="btn-secondary btn-sm h-8 w-8 justify-center p-0">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
                    </button>
                  )}
                  {q.status === 'accepted' && (
                    <button onClick={() => handleConvert(q)} className="btn-secondary btn-sm h-8 px-3 text-violet-700 justify-center">
                      <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
                    </button>
                  )}
                  <button onClick={() => openDelete(q)} className="btn-ghost btn-sm h-8 w-8 justify-center p-0 text-red-400 hover:text-red-600 hover:bg-red-50">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block card overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b border-sand-100 bg-sand-50">
                  {['Quote #', 'Client', 'Total', 'Status', 'Valid Until', 'Date', ''].map(h => (
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {quotes.map(q => (
                  <tr key={q._id} className="table-row">
                    <td className="table-td font-mono text-[12px] font-medium text-atelier-dark">{q.quoteNumber}</td>
                    <td className="table-td font-medium">{q.client?.fullName || '—'}</td>
                    <td className="table-td font-semibold">{fmt(q.totalPrice)} MAD</td>
                    <td className="table-td"><StatusBadge status={q.status} /></td>
                    <td className="table-td text-sand-500 text-[12px]">
                      {q.validUntil ? new Date(q.validUntil).toLocaleDateString('fr-MA') : '—'}
                    </td>
                    <td className="table-td text-sand-500 text-[12px]">
                      {new Date(q.createdAt).toLocaleDateString('fr-MA')}
                    </td>
                    <td className="table-td">
                      <div className="flex gap-1.5 justify-end">
                        <button onClick={() => openView(q)} className="btn-secondary btn-sm" title="View">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </button>
                        {q.status !== 'converted' && (
                          <button onClick={() => openEdit(q)} className="btn-secondary btn-sm" title="Edit">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
                          </button>
                        )}
                        {q.status === 'accepted' && (
                          <button onClick={() => handleConvert(q)} className="btn-secondary btn-sm text-violet-700" title="Convert to Invoice">
                            <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
                          </button>
                        )}
                        <button onClick={() => openDelete(q)} className="btn-ghost btn-sm text-red-400 hover:text-red-600 hover:bg-red-50">
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

      {/* Add/Edit Modal */}
      <Modal isOpen={modal === 'add' || modal === 'edit'} onClose={closeModal} title={modal === 'add' ? 'New Quote' : `Edit ${selected?.quoteNumber}`} size="xl">
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Client</label>
              <select className="input" value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} required>
                <option value="">Select client...</option>
                {clients.map(c => <option key={c._id} value={c._id}>{c.fullName}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {STATUS_OPTS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <FormInput label="Valid Until" type="date" value={form.validUntil} onChange={e => setForm({ ...form, validUntil: e.target.value })} />
            <FormInput label="Labor Cost (MAD)" type="number" value={form.laborCost} onChange={e => setForm({ ...form, laborCost: e.target.value })} min="0" />
          </div>

          {/* Items */}
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
                      <button type="button" onClick={() => removeItem(i)} className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between items-center px-1">
              <span className="text-[11px] text-sand-400">Total (incl. labor)</span>
              <span className="text-[14px] font-semibold text-atelier-dark">{fmt(liveTotal)} MAD</span>
            </div>
          </div>

          <FormInput label="Notes" type="textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving || pdfGenerating} className="btn-primary">
              {saving ? 'Enregistrement...' : pdfGenerating ? 'Génération PDF...' : 'Enregistrer le devis'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={modal === 'view'} onClose={closeModal} title={`Quote — ${selected?.quoteNumber}`} size="lg">
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Client', value: selected.client?.fullName || '—' },
                { label: 'Status', value: <StatusBadge status={selected.status} /> },
                { label: 'Created', value: new Date(selected.createdAt).toLocaleDateString('fr-MA') },
                { label: 'Valid Until', value: selected.validUntil ? new Date(selected.validUntil).toLocaleDateString('fr-MA') : '—' },
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
              <div className="flex justify-between text-[13px]">
                <span className="text-sand-500">Subtotal</span>
                <span>{fmt(selected.items?.reduce((s, i) => s + i.quantity * i.unitPrice, 0))} MAD</span>
              </div>
              {selected.laborCost > 0 && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-sand-500">Labor Cost</span>
                  <span>{fmt(selected.laborCost)} MAD</span>
                </div>
              )}
              <div className="flex justify-between text-[15px] font-semibold border-t border-sand-200 pt-2 mt-1">
                <span>Total</span><span>{fmt(selected.totalPrice)} MAD</span>
              </div>
            </div>

            {selected.notes && (
              <div className="bg-sand-50 rounded-xl p-4 border-l-2 border-bronze-300">
                <p className="text-[10px] text-sand-400 uppercase tracking-wide mb-1">Notes</p>
                <p className="text-[13px] text-sand-700">{selected.notes}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 justify-end pt-2">
              <button onClick={() => previewQuotePDF(selected, company)} className="btn-secondary">
                <Eye className="w-4 h-4" strokeWidth={1.5} />
                Aperçu PDF
              </button>
              <button onClick={() => downloadQuotePDF(selected, company)} className="btn-secondary">
                <Download className="w-4 h-4" strokeWidth={1.5} />
                Télécharger
              </button>
              <button onClick={() => printQuotePDF(selected, company)} className="btn-secondary">
                <Printer className="w-4 h-4" strokeWidth={1.5} />
                Imprimer
              </button>
              {selected.status === 'accepted' && (
                <button onClick={() => { handleConvert(selected); closeModal(); }} className="btn-primary">
                  <ArrowRight className="w-4 h-4" strokeWidth={2} />
                  Convert to Invoice
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* PDF Ready Modal */}
      <Modal isOpen={modal === 'pdf'} onClose={() => { setModal(null); setPdfQuote(null); }} title="Devis enregistré" size="sm">
        {pdfGenerating ? (
          <div className="flex flex-col items-center py-8 gap-3">
            <div className="w-8 h-8 border-2 border-sand-200 border-t-bronze-400 rounded-full animate-spin" />
            <p className="text-[13px] text-sand-500">Génération du PDF...</p>
          </div>
        ) : pdfQuote ? (
          <div className="space-y-5">
            <div className="flex flex-col items-center gap-2 py-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-emerald-500" strokeWidth={1.5} />
              </div>
              <p className="font-semibold text-atelier-dark">{pdfQuote.quoteNumber}</p>
              <p className="text-[13px] text-sand-400">Le devis a été enregistré avec succès.</p>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => { previewQuotePDF(pdfQuote, company); }}
                className="btn-primary w-full justify-center gap-2 py-2.5"
              >
                <Eye className="w-4 h-4" strokeWidth={1.5} />
                Aperçu PDF
              </button>
              <button
                onClick={() => { downloadQuotePDF(pdfQuote, company); }}
                className="btn-secondary w-full justify-center gap-2 py-2.5"
              >
                <Download className="w-4 h-4" strokeWidth={1.5} />
                Télécharger le PDF
              </button>
              <button
                onClick={() => { printQuotePDF(pdfQuote, company); }}
                className="btn-secondary w-full justify-center gap-2 py-2.5"
              >
                <Printer className="w-4 h-4" strokeWidth={1.5} />
                Imprimer
              </button>
            </div>

            <button
              onClick={() => { setModal(null); setPdfQuote(null); }}
              className="w-full text-center text-[12px] text-sand-400 hover:text-sand-600 transition-colors pt-1"
            >
              Fermer sans imprimer
            </button>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog isOpen={modal === 'delete'} onClose={closeModal} onConfirm={handleDelete} loading={saving}
        title="Delete Quote" message={`Delete quote "${selected?.quoteNumber}"? This cannot be undone.`} />
    </div>
  );
};

export default Quotes;

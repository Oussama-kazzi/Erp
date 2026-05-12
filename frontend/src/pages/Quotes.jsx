import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { FileText, Plus, Printer, ArrowRight, Download, Eye, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { logHistory } from '../lib/history';
import { useCompany } from '../context/CompanyContext';
import Modal from '../components/ui/Modal';
import FormInput from '../components/ui/FormInput';
import StatusBadge from '../components/ui/StatusBadge';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { downloadQuotePDF, previewQuotePDF, printQuotePDF } from '../utils/quotePDF';

const fmt = (n) => new Intl.NumberFormat('fr-MA').format(n ?? 0);

const emptyItem = { description: '', quantity: '', unitPrice: 0 };
const emptyForm = { client_id: '', items: [{ ...emptyItem }], labor_cost: 0, status: 'draft', valid_until: '', notes: '' };

const STATUS_OPTS = ['draft', 'sent', 'accepted', 'rejected', 'converted'];

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

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('quotes')
        .select('*, client:clients(id, full_name, phone, address, city)')
        .order('created_at', { ascending: false });
      if (statusFilter) query = query.eq('status', statusFilter);
      const { data, error } = await query;
      if (error) throw error;
      setQuotes(data || []);
    } catch { toast.error('Failed to load quotes'); }
    finally { setLoading(false); }
  }, [statusFilter]);

  const fetchClients = useCallback(async () => {
    try {
      const { data } = await supabase.from('clients').select('id, full_name, phone').order('full_name');
      setClients(data || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchQuotes(); }, [fetchQuotes]);
  useEffect(() => { fetchClients(); }, [fetchClients]);

  const openAdd = () => { setForm(emptyForm); setModal('add'); };
  const openEdit = (q) => {
    setForm({
      client_id: q.client_id || '',
      items: q.items || [{ ...emptyItem }],
      labor_cost: q.labor_cost || 0,
      status: q.status || 'draft',
      valid_until: q.valid_until ? q.valid_until.split('T')[0] : '',
      notes: q.notes || '',
    });
    setSelected(q); setModal('edit');
  };
  const openView = (q) => { setSelected(q); setModal('view'); };
  const openDelete = (q) => { setSelected(q); setModal('delete'); };
  const closeModal = () => { setModal(null); setSelected(null); setPdfQuote(null); };

  const setItem = (i, field, val) => {
    const items = [...form.items];
    items[i] = { ...items[i], [field]: val };
    setForm({ ...form, items });
  };
  const addItem = () => setForm({ ...form, items: [...form.items, { ...emptyItem }] });
  const removeItem = (i) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });

  const liveTotal = form.items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0) + (Number(form.labor_cost) || 0);

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const total = liveTotal;
      const payload = {
        client_id: form.client_id || null,
        items: form.items,
        labor_cost: Number(form.labor_cost) || 0,
        status: form.status,
        valid_until: form.valid_until || null,
        notes: form.notes,
        total_price: total,
      };

      let savedId;
      let quoteNumber;
      if (modal === 'add') {
        const { count } = await supabase.from('quotes').select('*', { count: 'exact', head: true });
        quoteNumber = `Q-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(3, '0')}`;
        const { data, error } = await supabase.from('quotes').insert({ ...payload, quote_number: quoteNumber }).select().single();
        if (error) throw error;
        savedId = data.id;
        await logHistory({ action: 'created', module: 'quote', description: `Quote ${quoteNumber} created`, referenceId: data.id });
      } else {
        quoteNumber = selected.quote_number;
        const prevStatus = selected.status;
        const isRejection = payload.status === 'rejected' && prevStatus !== 'rejected';
        await supabase.from('quotes').update(payload).eq('id', selected.id);
        savedId = selected.id;
        await logHistory({
          action: isRejection ? 'rejected' : 'updated',
          module: 'quote',
          description: isRejection ? `Quote ${quoteNumber} rejected` : `Quote ${quoteNumber} updated`,
          referenceId: selected.id,
        });
      }

      toast.success(modal === 'add' ? 'Quote saved' : 'Quote updated');
      closeModal();
      fetchQuotes();

      // After save, fetch full quote for PDF
      const { data: fullQuote } = await supabase
        .from('quotes')
        .select('*, client:clients(id, full_name, phone, address, city)')
        .eq('id', savedId)
        .single();
      if (fullQuote) { setPdfQuote(fullQuote); setModal('pdf'); }
    } catch (err) { toast.error(err.message || 'Error'); }
    finally { setSaving(false); }
  };

  const handleConvert = async (q) => {
    if (!window.confirm(`Convert quote ${q.quote_number} to invoice?`)) return;
    try {
      const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true });
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(3, '0')}`;
      const { error } = await supabase.from('invoices').insert({
        invoice_number: invoiceNumber,
        client_id: q.client_id || null,
        related_quote_id: q.id,
        items: q.items,
        labor_cost: q.labor_cost || 0,
        notes: q.notes || '',
        total_amount: q.total_price,
        paid_amount: 0,
        remaining_amount: q.total_price,
        payment_status: 'unpaid',
      });
      if (error) throw error;
      await supabase.from('quotes').update({ converted_to_invoice: true, status: 'converted' }).eq('id', q.id);
      await logHistory({
        action: 'converted', module: 'quote',
        description: `Quote ${q.quote_number} converted to invoice ${invoiceNumber}`,
        referenceId: q.id,
      });
      toast.success('Converted to invoice');
      fetchQuotes();
    } catch (err) { toast.error(err.message || 'Error'); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await supabase.from('quotes').delete().eq('id', selected.id);
      await logHistory({ action: 'deleted', module: 'quote', description: `Quote ${selected.quote_number} deleted` });
      toast.success('Quote deleted'); closeModal(); fetchQuotes();
    } catch { toast.error('Error'); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="card px-4 py-2.5 flex items-center gap-2">
          <span className="text-sand-400 text-xs uppercase tracking-wide">Total</span>
          <span className="text-atelier-dark font-semibold">{quotes.length} quotes</span>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus className="w-4 h-4" strokeWidth={2} />
          New Quote
        </button>
      </div>

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
              <div key={q.id} className="card p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-mono text-[11px] text-sand-400">{q.quote_number}</p>
                    <p className="font-medium text-atelier-dark text-sm mt-0.5">{q.client?.full_name || '—'}</p>
                  </div>
                  <StatusBadge status={q.status} />
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-base font-semibold text-atelier-dark">{fmt(q.total_price)} <span className="text-xs font-normal text-sand-400">MAD</span></span>
                  <p className="text-[10px] text-sand-400">
                    {q.valid_until ? `Valid until ${new Date(q.valid_until).toLocaleDateString('fr-MA')}` : new Date(q.created_at).toLocaleDateString('fr-MA')}
                  </p>
                </div>
                <div className="flex gap-2 pt-3 border-t border-sand-100">
                  <button onClick={() => openView(q)} className="btn-secondary btn-sm flex-1 justify-center h-8">View</button>
                  {!['converted'].includes(q.status) && (
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
                    <tr key={q.id} className="table-row">
                      <td className="table-td font-mono text-[12px] font-medium text-atelier-dark">{q.quote_number}</td>
                      <td className="table-td font-medium">{q.client?.full_name || '—'}</td>
                      <td className="table-td font-semibold">{fmt(q.total_price)} MAD</td>
                      <td className="table-td"><StatusBadge status={q.status} /></td>
                      <td className="table-td text-sand-500 text-[12px]">{q.valid_until ? new Date(q.valid_until).toLocaleDateString('fr-MA') : '—'}</td>
                      <td className="table-td text-sand-500 text-[12px]">{new Date(q.created_at).toLocaleDateString('fr-MA')}</td>
                      <td className="table-td">
                        <div className="flex gap-1.5 justify-end">
                          <button onClick={() => openView(q)} className="btn-secondary btn-sm" title="View">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          </button>
                          {!['converted'].includes(q.status) && (
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
      <Modal isOpen={modal === 'add' || modal === 'edit'} onClose={closeModal} title={modal === 'add' ? 'New Quote' : `Edit ${selected?.quote_number}`} size="xl">
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Client</label>
              <select className="input" value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })} required>
                <option value="">Select client...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {STATUS_OPTS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <FormInput label="Valid Until" type="date" value={form.valid_until} onChange={e => setForm({ ...form, valid_until: e.target.value })} />
            <FormInput label="Labor Cost (MAD)" type="number" value={form.labor_cost} onChange={e => setForm({ ...form, labor_cost: e.target.value })} min="0" />
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
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Save Quote'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={modal === 'view'} onClose={closeModal} title={`Quote — ${selected?.quote_number}`} size="lg">
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Client', value: selected.client?.full_name || '—' },
                { label: 'Status', value: <StatusBadge status={selected.status} /> },
                { label: 'Created', value: new Date(selected.created_at).toLocaleDateString('fr-MA') },
                { label: 'Valid Until', value: selected.valid_until ? new Date(selected.valid_until).toLocaleDateString('fr-MA') : '—' },
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
                <span>{fmt(selected.items?.reduce((s, i) => s + (Number(i.quantity) || 0) * i.unitPrice, 0))} MAD</span>
              </div>
              {selected.labor_cost > 0 && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-sand-500">Labor Cost</span>
                  <span>{fmt(selected.labor_cost)} MAD</span>
                </div>
              )}
              <div className="flex justify-between text-[15px] font-semibold border-t border-sand-200 pt-2 mt-1">
                <span>Total</span><span>{fmt(selected.total_price)} MAD</span>
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
                <Eye className="w-4 h-4" strokeWidth={1.5} /> Preview PDF
              </button>
              <button onClick={() => downloadQuotePDF(selected, company)} className="btn-secondary">
                <Download className="w-4 h-4" strokeWidth={1.5} /> Download
              </button>
              <button onClick={() => printQuotePDF(selected, company)} className="btn-secondary">
                <Printer className="w-4 h-4" strokeWidth={1.5} /> Print
              </button>
              {selected.status === 'accepted' && (
                <button onClick={() => { handleConvert(selected); closeModal(); }} className="btn-primary">
                  <ArrowRight className="w-4 h-4" strokeWidth={2} /> Convert to Invoice
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* PDF Modal */}
      <Modal isOpen={modal === 'pdf'} onClose={() => { setModal(null); setPdfQuote(null); }} title="Quote Saved" size="sm">
        {pdfQuote && (
          <div className="space-y-5">
            <div className="flex flex-col items-center gap-2 py-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-emerald-500" strokeWidth={1.5} />
              </div>
              <p className="font-semibold text-atelier-dark">{pdfQuote.quote_number}</p>
              <p className="text-[13px] text-sand-400">Quote saved successfully.</p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button onClick={() => previewQuotePDF(pdfQuote, company)} className="btn-primary w-full justify-center gap-2 py-2.5">
                <Eye className="w-4 h-4" strokeWidth={1.5} /> Preview PDF
              </button>
              <button onClick={() => downloadQuotePDF(pdfQuote, company)} className="btn-secondary w-full justify-center gap-2 py-2.5">
                <Download className="w-4 h-4" strokeWidth={1.5} /> Download PDF
              </button>
              <button onClick={() => printQuotePDF(pdfQuote, company)} className="btn-secondary w-full justify-center gap-2 py-2.5">
                <Printer className="w-4 h-4" strokeWidth={1.5} /> Print
              </button>
            </div>
            <button onClick={() => { setModal(null); setPdfQuote(null); }} className="w-full text-center text-[12px] text-sand-400 hover:text-sand-600 pt-1">
              Close without printing
            </button>
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={modal === 'delete'} onClose={closeModal} onConfirm={handleDelete} loading={saving}
        title="Delete Quote" message={`Delete quote "${selected?.quote_number}"?`} />
    </div>
  );
};

export default Quotes;

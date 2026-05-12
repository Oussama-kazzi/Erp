import React, { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { Package, Plus, AlertTriangle, History, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { logHistory } from '../lib/history';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import SearchInput from '../components/ui/SearchInput';
import FormInput from '../components/ui/FormInput';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const fmt = (n) => new Intl.NumberFormat('fr-MA').format(n ?? 0);
const empty = { name: '', category: '', supplier: '', quantity: 0, low_stock_threshold: 5, cost_price: 0, selling_price: 0, status: 'available', notes: '' };
const statusOpts = [{ value: 'available', label: 'Available' }, { value: 'reserved', label: 'Reserved' }, { value: 'sold', label: 'Sold' }];

const ProductImage = ({ image_url, name, className = '' }) => {
  const [err, setErr] = useState(false);
  if (!image_url || err) return (
    <div className={`bg-sand-100 flex items-center justify-center text-sand-300 ${className}`}>
      <Package className="w-8 h-8" strokeWidth={1} />
    </div>
  );
  return <img src={image_url} alt={name} onError={() => setErr(true)} className={`object-cover ${className}`} />;
};

const LowStockBadge = () => (
  <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 text-[10px] font-medium border border-amber-200">
    <AlertTriangle className="w-3 h-3" strokeWidth={2} />
    Low stock
  </div>
);

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [view, setView] = useState('grid');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(empty);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [stockMovements, setStockMovements] = useState([]);
  const [stockForm, setStockForm] = useState({ type: 'IN', quantity: 1, reason: '', supplier: '' });
  const fileInputRef = useRef();

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('products').select('*').order('created_at', { ascending: false });
      if (search) query = query.ilike('name', `%${search}%`);
      if (statusFilter) query = query.eq('status', statusFilter);
      const { data, error } = await query;
      if (error) throw error;
      setProducts(data || []);
    } catch { toast.error('Failed to load products'); }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const openAdd = () => { setForm(empty); setImageFile(null); setImagePreview(null); setModal('add'); };
  const openEdit = (p) => {
    setForm(p);
    setSelected(p);
    setImageFile(null);
    setImagePreview(p.image_url || null);
    setModal('edit');
  };
  const openDelete = (p) => { setSelected(p); setModal('delete'); };

  const openStock = (p, type) => {
    setSelected(p);
    setStockForm({ type, quantity: 1, reason: '', supplier: '' });
    setModal('stock');
  };

  const openHistory = async (p) => {
    setSelected(p);
    setStockMovements([]);
    setModal('history');
    try {
      const { data, error } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('product_id', p.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setStockMovements(data || []);
    } catch { toast.error('Failed to load stock history'); }
  };

  const closeModal = () => { setModal(null); setSelected(null); setImageFile(null); setImagePreview(null); };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async (file) => {
    const ext = file.name.split('.').pop();
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('products').upload(filename, file, { upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from('products').getPublicUrl(filename);
    return data.publicUrl;
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      let image_url = form.image_url || null;
      if (imageFile) {
        image_url = await uploadImage(imageFile);
      }
      const payload = {
        name: form.name,
        category: form.category || null,
        supplier: form.supplier || null,
        quantity: Number(form.quantity) || 0,
        low_stock_threshold: Number(form.low_stock_threshold) || 5,
        cost_price: Number(form.cost_price) || 0,
        selling_price: Number(form.selling_price) || 0,
        status: form.status || 'available',
        notes: form.notes || null,
        image_url,
      };
      if (modal === 'add') {
        const { data, error } = await supabase.from('products').insert(payload).select().single();
        if (error) throw error;
        await logHistory({ action: 'created', module: 'product', description: `Product "${form.name}" added to stock`, referenceId: data.id });
      } else {
        const { error } = await supabase.from('products').update(payload).eq('id', selected.id);
        if (error) throw error;
        await logHistory({ action: 'updated', module: 'product', description: `Product "${form.name}" updated`, referenceId: selected.id });
      }
      toast.success(modal === 'add' ? 'Product added' : 'Product updated');
      closeModal(); fetchProducts();
    } catch (err) { toast.error(err.message || 'Error'); }
    finally { setSaving(false); }
  };

  const handleStockMovement = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const qty = Number(stockForm.quantity) || 0;
      const { error: mvErr } = await supabase.from('stock_movements').insert({
        product_id: selected.id,
        type: stockForm.type,
        quantity: qty,
        reason: stockForm.reason || null,
        supplier: stockForm.supplier || null,
      });
      if (mvErr) throw mvErr;

      const newQty = stockForm.type === 'IN'
        ? selected.quantity + qty
        : Math.max(0, selected.quantity - qty);
      const { error: upErr } = await supabase.from('products').update({ quantity: newQty }).eq('id', selected.id);
      if (upErr) throw upErr;

      const action = stockForm.type === 'IN' ? 'stock_in' : 'stock_out';
      await logHistory({
        action,
        module: 'product',
        description: `${stockForm.type === 'IN' ? '+' : '−'}${qty} pcs for "${selected.name}"${stockForm.reason ? ` — ${stockForm.reason}` : ''}`,
        referenceId: selected.id,
      });
      toast.success(stockForm.type === 'IN' ? 'Stock restocked' : 'Stock used');
      closeModal(); fetchProducts();
    } catch (err) { toast.error(err.message || 'Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('products').delete().eq('id', selected.id);
      if (error) throw error;
      await logHistory({ action: 'deleted', module: 'product', description: `Product "${selected.name}" removed` });
      toast.success('Product removed'); closeModal(); fetchProducts();
    } catch { toast.error('Error'); } finally { setSaving(false); }
  };

  const isLowStock = (p) => p != null && p.status === 'available' && p.quantity <= (p.low_stock_threshold ?? 5);
  const totalStock = products.filter(p => p.status === 'available').reduce((s, p) => s + p.quantity, 0);
  const stockValue = products.filter(p => p.status === 'available').reduce((s, p) => s + p.quantity * p.cost_price, 0);
  const lowCount = products.filter(isLowStock).length;

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-4 justify-between">
        <div className="flex gap-3 flex-wrap">
          <div className="card px-4 py-2.5 flex items-center gap-2">
            <span className="text-sand-400 text-xs uppercase tracking-wide">Stock</span>
            <span className="text-atelier-dark font-semibold">{totalStock} pcs</span>
          </div>
          <div className="card px-4 py-2.5 flex items-center gap-2">
            <span className="text-sand-400 text-xs uppercase tracking-wide">Value</span>
            <span className="text-atelier-dark font-semibold">{fmt(stockValue)} MAD</span>
          </div>
          {lowCount > 0 && (
            <div className="card px-4 py-2.5 flex items-center gap-2 border-amber-200">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" strokeWidth={2} />
              <span className="text-amber-600 text-xs font-semibold">{lowCount} low stock</span>
            </div>
          )}
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus className="w-4 h-4" strokeWidth={2} />
          Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="w-full sm:flex-1 sm:min-w-[200px] sm:w-auto">
          <SearchInput value={search} onChange={setSearch} placeholder="Search products..." />
        </div>
        <div className="flex gap-1 bg-sand-100 p-1 rounded-xl">
          {[{ value: '', label: 'All' }, ...statusOpts].map((o) => (
            <button key={o.value} onClick={() => setStatusFilter(o.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === o.value ? 'bg-white shadow-warm-xs text-atelier-dark' : 'text-sand-500 hover:text-sand-700'}`}>
              {o.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-sand-100 p-1 rounded-xl">
          {[
            { v: 'grid', icon: <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16"><path d="M1 2.5A1.5 1.5 0 012.5 1h3A1.5 1.5 0 017 2.5v3A1.5 1.5 0 015.5 7h-3A1.5 1.5 0 011 5.5v-3zM9 2.5A1.5 1.5 0 0110.5 1h3A1.5 1.5 0 0115 2.5v3A1.5 1.5 0 0113.5 7h-3A1.5 1.5 0 019 5.5v-3zM1 10.5A1.5 1.5 0 012.5 9h3A1.5 1.5 0 017 10.5v3A1.5 1.5 0 015.5 15h-3A1.5 1.5 0 011 13.5v-3zM9 10.5A1.5 1.5 0 0110.5 9h3A1.5 1.5 0 0115 10.5v3A1.5 1.5 0 0113.5 15h-3A1.5 1.5 0 019 13.5v-3z"/></svg> },
            { v: 'list', icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg> }
          ].map(({ v, icon }) => (
            <button key={v} onClick={() => setView(v)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${view === v ? 'bg-white shadow-warm-xs text-atelier-dark' : 'text-sand-400 hover:text-sand-600'}`}>
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* Grid view */}
      {view === 'grid' && (
        loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-sand-200 border-t-bronze-400 rounded-full animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 rounded-2xl bg-sand-100 flex items-center justify-center mx-auto mb-3">
              <Package className="w-6 h-6 text-sand-300" strokeWidth={1.5} />
            </div>
            <p className="text-[13px] text-sand-400">No products yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((p) => (
              <div key={p.id} className="card overflow-hidden group card-hover">
                <div className="aspect-[4/3] relative overflow-hidden">
                  <ProductImage image_url={p.image_url} name={p.name} className="w-full h-full transition-transform duration-300 group-hover:scale-105" />
                  <div className="absolute top-2.5 right-2.5">
                    <StatusBadge status={p.status} />
                  </div>
                  {isLowStock(p) && (
                    <div className="absolute top-2.5 left-2.5">
                      <LowStockBadge />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="font-medium text-atelier-dark leading-snug" style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '16px' }}>{p.name}</p>
                  {p.category && <p className="text-xs text-sand-400 mt-0.5">{p.category}</p>}
                  <div className="flex items-center justify-between mt-3">
                    <div>
                      <p className="text-base font-semibold text-atelier-dark">{fmt(p.selling_price)} <span className="text-xs font-normal text-sand-400">MAD</span></p>
                      <p className="text-[10px] text-sand-400">Cost: {fmt(p.cost_price)} MAD</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-sand-400">Qty</p>
                      <p className={`font-semibold ${isLowStock(p) ? 'text-amber-600' : 'text-atelier-dark'}`}>{p.quantity}</p>
                    </div>
                  </div>

                  <div className="flex gap-1.5 mt-3 pt-3 border-t border-sand-100">
                    <button onClick={() => openStock(p, 'IN')} className="btn-secondary btn-sm flex-1 justify-center text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200" title="Restock">
                      <ArrowDownToLine className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span className="text-[11px]">In</span>
                    </button>
                    <button onClick={() => openStock(p, 'OUT')} className="btn-secondary btn-sm flex-1 justify-center text-orange-700 hover:bg-orange-50 hover:border-orange-200" title="Use stock">
                      <ArrowUpFromLine className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span className="text-[11px]">Out</span>
                    </button>
                    <button onClick={() => openHistory(p)} className="btn-secondary btn-sm px-2.5" title="Stock history">
                      <History className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                    <button onClick={() => openEdit(p)} className="btn-secondary btn-sm px-2.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
                    </button>
                    <button onClick={() => openDelete(p)} className="btn-ghost btn-sm text-red-400 hover:text-red-600 hover:bg-red-50 px-2.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* List view */}
      {view === 'list' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead><tr className="border-b border-sand-100 bg-sand-50">
              {['', 'Product', 'Category', 'Supplier', 'Qty', 'Cost', 'Price', 'Margin', 'Status', ''].map(h => (
                <th key={h} className="table-th">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="table-row">
                  <td className="table-td w-12">
                    <div className="w-10 h-10 rounded-xl overflow-hidden">
                      <ProductImage image_url={p.image_url} name={p.name} className="w-full h-full" />
                    </div>
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-atelier-dark">{p.name}</span>
                      {isLowStock(p) && <LowStockBadge />}
                    </div>
                  </td>
                  <td className="table-td text-sand-500">{p.category || '—'}</td>
                  <td className="table-td text-sand-500">{p.supplier || '—'}</td>
                  <td className={`table-td font-medium ${isLowStock(p) ? 'text-amber-600' : ''}`}>{p.quantity}</td>
                  <td className="table-td">{fmt(p.cost_price)} MAD</td>
                  <td className="table-td font-medium">{fmt(p.selling_price)} MAD</td>
                  <td className="table-td">
                    <span className={p.selling_price - p.cost_price >= 0 ? 'text-emerald-600 font-medium' : 'text-red-500'}>
                      {fmt(p.selling_price - p.cost_price)} MAD
                    </span>
                  </td>
                  <td className="table-td"><StatusBadge status={p.status} /></td>
                  <td className="table-td">
                    <div className="flex gap-1.5">
                      <button onClick={() => openStock(p, 'IN')} className="btn-secondary btn-sm text-emerald-700" title="Restock">
                        <ArrowDownToLine className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </button>
                      <button onClick={() => openStock(p, 'OUT')} className="btn-secondary btn-sm text-orange-700" title="Use">
                        <ArrowUpFromLine className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </button>
                      <button onClick={() => openHistory(p)} className="btn-secondary btn-sm" title="History">
                        <History className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </button>
                      <button onClick={() => openEdit(p)} className="btn-secondary btn-sm">Edit</button>
                      <button onClick={() => openDelete(p)} className="btn-ghost btn-sm text-red-400 hover:text-red-600 hover:bg-red-50">
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
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={modal === 'add' || modal === 'edit'} onClose={closeModal} title={modal === 'add' ? 'Add Product' : 'Edit Product'} size="lg">
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="label">Product Image</label>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-dashed border-sand-200 bg-sand-50 shrink-0">
                {imagePreview
                  ? <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-sand-300"><Package className="w-8 h-8" strokeWidth={1} /></div>
                }
              </div>
              <div className="space-y-2 flex-1">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="img-input" />
                <label htmlFor="img-input" className="btn-secondary cursor-pointer text-xs">
                  {imagePreview ? 'Change image' : 'Upload image'}
                </label>
                {imagePreview && (
                  <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); setForm({ ...form, image_url: null }); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="block text-xs text-red-400 hover:text-red-600 transition-colors">Remove</button>
                )}
                <p className="text-xs text-sand-400">JPG, PNG, WEBP · max 5MB</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput label="Product Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            <FormInput label="Category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="e.g. Seating, Tables..." />
            <FormInput label="Supplier / Material" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} />
            <FormInput label="Quantity" type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
            <FormInput label="Low Stock Alert (qty)" type="number" value={form.low_stock_threshold} onChange={e => setForm({ ...form, low_stock_threshold: e.target.value })} />
            <FormInput label="Cost Price (MAD)" type="number" value={form.cost_price} onChange={e => setForm({ ...form, cost_price: e.target.value })} />
            <FormInput label="Selling Price (MAD)" type="number" value={form.selling_price} onChange={e => setForm({ ...form, selling_price: e.target.value })} />
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {statusOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <FormInput label="Notes" type="textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Materials, dimensions, wood type..." />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Product'}</button>
          </div>
        </form>
      </Modal>

      {/* Stock Movement Modal */}
      <Modal
        isOpen={modal === 'stock'}
        onClose={closeModal}
        title={stockForm.type === 'IN' ? `Restock — ${selected?.name}` : `Use Stock — ${selected?.name}`}
        size="sm"
      >
        <div className="mb-4 p-3 bg-sand-50 rounded-xl flex items-center justify-between">
          <span className="text-xs text-sand-500">Current stock</span>
          <span className={`font-semibold text-sm ${isLowStock(selected) ? 'text-amber-600' : 'text-atelier-dark'}`}>
            {selected?.quantity} pcs
          </span>
        </div>
        <form onSubmit={handleStockMovement} className="space-y-4">
          <FormInput
            label={`Quantity to ${stockForm.type === 'IN' ? 'add' : 'remove'}`}
            type="number"
            value={stockForm.quantity}
            onChange={e => setStockForm({ ...stockForm, quantity: e.target.value })}
            required min="1"
            max={stockForm.type === 'OUT' ? selected?.quantity : undefined}
          />
          <FormInput
            label="Reason"
            value={stockForm.reason}
            onChange={e => setStockForm({ ...stockForm, reason: e.target.value })}
            placeholder={stockForm.type === 'IN' ? 'Purchase, return...' : 'Used in order, damaged...'}
          />
          {stockForm.type === 'IN' && (
            <FormInput
              label="Supplier"
              value={stockForm.supplier}
              onChange={e => setStockForm({ ...stockForm, supplier: e.target.value })}
              placeholder="Supplier name..."
            />
          )}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className={stockForm.type === 'IN' ? 'btn-primary' : 'px-4 py-2 rounded-xl text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:opacity-50'}>
              {saving ? 'Saving...' : stockForm.type === 'IN' ? 'Restock' : 'Use Stock'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Stock History Modal */}
      <Modal isOpen={modal === 'history'} onClose={closeModal} title={`Stock History — ${selected?.name}`} size="md">
        {stockMovements.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-10 h-10 rounded-2xl bg-sand-100 flex items-center justify-center mx-auto mb-3">
              <History className="w-5 h-5 text-sand-300" strokeWidth={1.5} />
            </div>
            <p className="text-[13px] text-sand-400">No stock movements yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {stockMovements.map((m, i) => (
              <div key={m.id || i} className="flex items-center gap-4 p-3 rounded-xl bg-sand-50">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${m.type === 'IN' ? 'bg-emerald-100' : 'bg-orange-100'}`}>
                  {m.type === 'IN'
                    ? <ArrowDownToLine className="w-4 h-4 text-emerald-600" strokeWidth={1.5} />
                    : <ArrowUpFromLine className="w-4 h-4 text-orange-600" strokeWidth={1.5} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${m.type === 'IN' ? 'text-emerald-700' : 'text-orange-700'}`}>
                      {m.type === 'IN' ? '+' : '−'}{m.quantity} pcs
                    </span>
                    {m.reason && <span className="text-xs text-sand-500">{m.reason}</span>}
                  </div>
                  {m.supplier && <p className="text-[11px] text-sand-400 mt-0.5">From: {m.supplier}</p>}
                </div>
                <span className="text-[11px] text-sand-400 shrink-0">{new Date(m.created_at).toLocaleDateString('fr-MA')}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={modal === 'delete'} onClose={closeModal} onConfirm={handleDelete} loading={saving}
        title="Remove Product" message={`Remove "${selected?.name}"? This action cannot be undone.`} />
    </div>
  );
};

export default Products;

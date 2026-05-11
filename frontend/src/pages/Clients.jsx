import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Users, Plus, Phone, MapPin, ClipboardList, TrendingUp } from 'lucide-react';
import api from '../api';
import Modal from '../components/ui/Modal';
import FormInput from '../components/ui/FormInput';
import SearchInput from '../components/ui/SearchInput';
import StatusBadge from '../components/ui/StatusBadge';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const fmt = (n) => new Intl.NumberFormat('fr-MA').format(n ?? 0);
const empty = { fullName: '', phone: '', address: '', notes: '' };

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/clients', { params: search ? { search } : {} });
      setClients(res.data.clients);
    } catch { toast.error('Failed to load clients'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const openAdd = () => { setForm(empty); setModal('add'); };
  const openEdit = (c) => { setForm(c); setSelected(c); setModal('edit'); };
  const openDelete = (c) => { setSelected(c); setModal('delete'); };
  const openProfile = async (c) => {
    setSelected(c);
    setModal('profile');
    try {
      const res = await api.get(`/clients/${c._id}`);
      setProfileData(res.data);
    } catch { toast.error('Failed to load client profile'); }
  };
  const closeModal = () => { setModal(null); setSelected(null); setProfileData(null); };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (modal === 'add') await api.post('/clients', form);
      else await api.put(`/clients/${selected._id}`, form);
      toast.success(modal === 'add' ? 'Client added' : 'Client updated');
      closeModal(); fetchClients();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try { await api.delete(`/clients/${selected._id}`); toast.success('Client removed'); closeModal(); fetchClients(); }
    catch { toast.error('Error'); } finally { setSaving(false); }
  };

  const initials = (name = '') => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <div className="card px-4 py-2.5 flex items-center gap-2">
            <span className="text-sand-400 text-xs uppercase tracking-wide">Total</span>
            <span className="text-atelier-dark font-semibold">{clients.length} clients</span>
          </div>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus className="w-4 h-4" strokeWidth={2} />
          New Client
        </button>
      </div>

      {/* Search */}
      <div className="card p-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search clients by name..." />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-sand-200 border-t-bronze-400 rounded-full animate-spin" />
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-2xl bg-sand-100 flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-sand-300" strokeWidth={1.5} />
          </div>
          <p className="text-[13px] text-sand-400">No clients yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clients.map(c => (
            <div key={c._id} className="card p-5 card-hover">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-11 h-11 rounded-xl bg-bronze-100 flex items-center justify-center text-bronze-700 font-semibold text-sm shrink-0">
                  {initials(c.fullName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-atelier-dark text-[14px] truncate">{c.fullName}</p>
                  {c.phone && (
                    <div className="flex items-center gap-1.5 mt-0.5 text-sand-400">
                      <Phone className="w-3 h-3" strokeWidth={1.5} />
                      <p className="text-[12px]">{c.phone}</p>
                    </div>
                  )}
                  {c.address && (
                    <div className="flex items-center gap-1.5 mt-0.5 text-sand-400">
                      <MapPin className="w-3 h-3" strokeWidth={1.5} />
                      <p className="text-[12px] truncate">{c.address}</p>
                    </div>
                  )}
                </div>
              </div>

              {c.notes && (
                <p className="text-[12px] text-sand-500 bg-sand-50 rounded-xl px-3 py-2 mb-4 line-clamp-2">{c.notes}</p>
              )}

              <p className="text-[10px] text-sand-400 uppercase tracking-wider mb-1">
                Added {new Date(c.createdAt).toLocaleDateString('fr-MA')}
              </p>

              <div className="flex gap-2 mt-3 pt-3 border-t border-sand-100">
                <button onClick={() => openProfile(c)} className="btn-secondary btn-sm flex-1 justify-center">
                  <ClipboardList className="w-3.5 h-3.5" strokeWidth={1.5} />
                  View Orders
                </button>
                <button onClick={() => openEdit(c)} className="btn-secondary btn-sm px-3">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
                </button>
                <button onClick={() => openDelete(c)} className="btn-ghost btn-sm text-red-400 hover:text-red-600 hover:bg-red-50">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={modal === 'add' || modal === 'edit'} onClose={closeModal} title={modal === 'add' ? 'New Client' : 'Edit Client'} size="sm">
        <form onSubmit={handleSave} className="space-y-4">
          <FormInput label="Full Name" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} required />
          <FormInput label="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          <FormInput label="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
          <FormInput label="Notes" type="textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Client'}</button>
          </div>
        </form>
      </Modal>

      {/* Client Profile Modal */}
      <Modal isOpen={modal === 'profile'} onClose={closeModal} title={`Client — ${selected?.fullName}`} size="lg">
        {!profileData ? (
          <div className="flex justify-center py-8">
            <div className="w-7 h-7 border-2 border-sand-200 border-t-bronze-400 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total Orders', value: profileData.stats.totalOrders },
                { label: 'Total Paid', value: `${fmt(profileData.stats.totalPaid)} MAD` },
                { label: 'Outstanding', value: `${fmt(profileData.stats.totalRemaining)} MAD`, red: profileData.stats.totalRemaining > 0 },
              ].map(s => (
                <div key={s.label} className="bg-sand-50 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-sand-400 uppercase tracking-wide mb-1">{s.label}</p>
                  <p className={`text-[15px] font-semibold ${s.red ? 'text-red-600' : 'text-atelier-dark'}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Order history */}
            <div>
              <p className="text-[11px] font-semibold text-sand-500 uppercase tracking-wider mb-2">Order History</p>
              {profileData.orders.length === 0 ? (
                <p className="text-[13px] text-sand-400 text-center py-6">No orders yet</p>
              ) : (
                <div className="card overflow-hidden">
                  {profileData.orders.map((o, i) => (
                    <div key={o._id} className={`flex items-center gap-4 px-4 py-3 ${i !== 0 ? 'border-t border-sand-100' : ''}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-atelier-dark">{o.items?.[0]?.name || 'Order'}</p>
                        <p className="text-[11px] text-sand-400 mt-0.5">{new Date(o.orderDate).toLocaleDateString('fr-MA')}</p>
                      </div>
                      <StatusBadge status={o.status} />
                      <div className="text-right shrink-0">
                        <p className="text-[13px] font-semibold text-atelier-dark">{fmt(o.totalPrice)} MAD</p>
                        {o.remainingAmount > 0 && <p className="text-[11px] text-red-500">{fmt(o.remainingAmount)} left</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={modal === 'delete'} onClose={closeModal} onConfirm={handleDelete} loading={saving}
        title="Delete Client" message={`Remove "${selected?.fullName}"? This action cannot be undone.`} />
    </div>
  );
};

export default Clients;

import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Upload, X, Building2, Palette } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { supabase } from '../lib/supabase';
import FormInput from '../components/ui/FormInput';

const ColorField = ({ label, value, onChange }) => (
  <div>
    <label className="label">{label}</label>
    <div className="flex items-center gap-3 input py-2">
      <div
        className="w-6 h-6 rounded-lg border border-sand-200 shrink-0 cursor-pointer overflow-hidden"
        style={{ background: value }}
      >
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="opacity-0 w-full h-full cursor-pointer"
        />
      </div>
      <span className="text-sm text-atelier-dark font-mono">{value}</span>
      <input
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="sr-only"
        id={`color-${label}`}
      />
      <label
        htmlFor={`color-${label}`}
        className="ml-auto text-[11px] text-sand-400 hover:text-sand-600 cursor-pointer transition-colors"
      >
        Change
      </label>
    </div>
  </div>
);

const Settings = () => {
  const { user } = useAuth();
  const { company, refresh } = useCompany();

  // ── Password form ──────────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ newPassword: '', confirmPassword: '' });
  const [pwSaving, setPwSaving] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (pwForm.newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setPwSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwForm.newPassword });
      if (error) throw error;
      toast.success('Password updated');
      setPwForm({ newPassword: '', confirmPassword: '' });
    } catch (err) { toast.error(err.message || 'Error'); }
    finally { setPwSaving(false); }
  };

  // ── Branding form ──────────────────────────────────────────────────────
  const [brand, setBrand] = useState({
    companyName: '', companyEmail: '', companyPhone: '',
    companyAddress: '', companyCity: '', ice: '', rc: '',
    primaryColor: '#1A1714', secondaryColor: '#B8936A',
  });
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile]       = useState(null);
  const [dragOver, setDragOver]       = useState(false);
  const [brandSaving, setBrandSaving] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    setBrand({
      companyName:    company.companyName    || '',
      companyEmail:   company.companyEmail   || '',
      companyPhone:   company.companyPhone   || '',
      companyAddress: company.companyAddress || '',
      companyCity:    company.companyCity    || '',
      ice:            company.ice            || '',
      rc:             company.rc             || '',
      primaryColor:   company.primaryColor   || '#1A1714',
      secondaryColor: company.secondaryColor || '#B8936A',
    });
    setLogoPreview(company.logoUrl || null);
  }, [company]);

  const handleLogoFile = (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Logo must be under 5 MB'); return; }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    handleLogoFile(e.dataTransfer.files[0]);
  };

  const removeLogo = async () => {
    if (logoFile) { setLogoFile(null); setLogoPreview(company.logoUrl || null); return; }
    try {
      const { error } = await supabase.from('company_settings').update({ logo_url: null }).eq('id', 1);
      if (error) throw error;
      setLogoPreview(null);
      await refresh();
      toast.success('Logo removed');
    } catch { toast.error('Error'); }
  };

  const uploadLogo = async (file) => {
    const ext = file.name.split('.').pop();
    const filename = `logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('logos').upload(filename, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('logos').getPublicUrl(filename);
    return data.publicUrl;
  };

  const handleBrandSave = async (e) => {
    e.preventDefault(); setBrandSaving(true);
    try {
      let logo_url = company.logoUrl || null;
      if (logoFile) {
        logo_url = await uploadLogo(logoFile);
      }
      const payload = {
        id: 1,
        company_name:    brand.companyName    || null,
        company_email:   brand.companyEmail   || null,
        company_phone:   brand.companyPhone   || null,
        company_address: brand.companyAddress || null,
        company_city:    brand.companyCity    || null,
        ice:             brand.ice            || null,
        rc:              brand.rc             || null,
        primary_color:   brand.primaryColor,
        secondary_color: brand.secondaryColor,
        logo_url,
      };
      const { error } = await supabase.from('company_settings').upsert(payload);
      if (error) throw error;
      await refresh();
      setLogoFile(null);
      toast.success('Branding saved');
    } catch (err) { toast.error(err.message || 'Error'); }
    finally { setBrandSaving(false); }
  };

  const set = (field) => (e) => setBrand(b => ({ ...b, [field]: e.target.value }));

  return (
    <div className="space-y-5 max-w-2xl w-full">

      {/* ── Profile ── */}
      <div className="card p-6">
        <h2 className="section-title mb-5">Profile</h2>
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-atelier-dark flex items-center justify-center text-bronze-400 text-2xl font-semibold shrink-0"
            style={{ fontFamily: '"Cormorant Garamond", serif' }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="text-lg font-medium text-atelier-dark" style={{ fontFamily: '"Cormorant Garamond", serif' }}>{user?.name}</p>
            <p className="text-sm text-sand-500 mt-0.5">{user?.email}</p>
            <div className="mt-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-bronze-50 text-bronze-700 text-xs font-medium rounded-lg capitalize">
                <span className="w-1.5 h-1.5 rounded-full bg-bronze-400" />
                {user?.role || 'admin'}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-5 pt-5 border-t border-sand-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[{ label: 'Full Name', value: user?.name }, { label: 'Email Address', value: user?.email }].map(f => (
            <div key={f.label} className="bg-sand-50 rounded-xl p-3.5">
              <p className="text-xs text-sand-400 mb-1">{f.label}</p>
              <p className="text-sm font-medium text-atelier-dark">{f.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Security ── */}
      <div className="card p-6">
        <h2 className="section-title mb-5">Security</h2>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="New Password" type="password" value={pwForm.newPassword}
              onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} required />
            <FormInput label="Confirm New Password" type="password" value={pwForm.confirmPassword}
              onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })} required />
          </div>
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-sand-400">Minimum 6 characters</p>
            <button type="submit" disabled={pwSaving} className="btn-primary">
              {pwSaving ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Branding & Documents ── */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-bronze-50 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-bronze-600" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="section-title">Branding & Documents</h2>
            <p className="text-[11px] text-sand-400 mt-0.5">Apparaît dans les devis, factures et PDF générés</p>
          </div>
        </div>

        <form onSubmit={handleBrandSave} className="space-y-6">

          {/* Logo upload */}
          <div>
            <label className="label mb-2 block">Logo de l'entreprise</label>
            {logoPreview ? (
              <div className="flex items-center gap-4 p-4 bg-sand-50 rounded-xl border border-sand-200">
                <div className="w-24 h-16 rounded-lg overflow-hidden bg-white border border-sand-200 flex items-center justify-center shrink-0">
                  <img src={logoPreview} alt="Logo" className="max-w-full max-h-full object-contain p-1" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-atelier-dark">Logo actuel</p>
                  <p className="text-[11px] text-sand-400 mt-0.5">Ce logo apparaîtra dans tous vos documents</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <label htmlFor="logo-upload" className="btn-secondary btn-sm cursor-pointer">
                    <Upload className="w-3.5 h-3.5" strokeWidth={1.5} />
                    Changer
                  </label>
                  <button type="button" onClick={removeLogo} className="btn-ghost btn-sm text-red-400 hover:text-red-600 hover:bg-red-50">
                    <X className="w-3.5 h-3.5" strokeWidth={2} />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-bronze-400 bg-bronze-50'
                    : 'border-sand-200 hover:border-bronze-300 hover:bg-sand-50'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-sand-100 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-sand-400" strokeWidth={1.5} />
                  </div>
                  <p className="text-[13px] font-medium text-atelier-dark">
                    Déposer le logo ici ou <span className="text-bronze-600">parcourir</span>
                  </p>
                  <p className="text-[11px] text-sand-400">PNG, JPG, SVG, WEBP · max 5 MB</p>
                </div>
              </div>
            )}
            <input
              ref={fileRef}
              id="logo-upload"
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
              className="hidden"
              onChange={e => handleLogoFile(e.target.files[0])}
            />
          </div>

          {/* Company info */}
          <div>
            <p className="text-[11px] font-semibold text-sand-500 uppercase tracking-wider mb-3">Informations entreprise</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <FormInput label="Nom de l'entreprise" value={brand.companyName} onChange={set('companyName')} placeholder="Atelier" />
              </div>
              <FormInput label="Email" value={brand.companyEmail} onChange={set('companyEmail')} placeholder="contact@atelier.ma" />
              <FormInput label="Téléphone" value={brand.companyPhone} onChange={set('companyPhone')} placeholder="+212 6XX XXX XXX" />
              <div className="col-span-2">
                <FormInput label="Adresse" value={brand.companyAddress} onChange={set('companyAddress')} placeholder="123 Rue exemple, Quartier..." />
              </div>
              <FormInput label="Ville" value={brand.companyCity} onChange={set('companyCity')} placeholder="Casablanca" />
              <FormInput label="ICE" value={brand.ice} onChange={set('ice')} placeholder="Optionnel" />
              <FormInput label="RC" value={brand.rc} onChange={set('rc')} placeholder="Optionnel" />
            </div>
          </div>

          {/* Colors */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Palette className="w-3.5 h-3.5 text-sand-400" strokeWidth={1.5} />
              <p className="text-[11px] font-semibold text-sand-500 uppercase tracking-wider">Couleurs des documents</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <ColorField
                label="Couleur principale"
                value={brand.primaryColor}
                onChange={v => setBrand(b => ({ ...b, primaryColor: v }))}
              />
              <ColorField
                label="Couleur d'accent"
                value={brand.secondaryColor}
                onChange={v => setBrand(b => ({ ...b, secondaryColor: v }))}
              />
            </div>
            <p className="text-[11px] text-sand-400 mt-2">
              Ces couleurs sont utilisées dans l'en-tête, le tableau et le pied de page des PDF.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-sand-100">
            <p className="text-[11px] text-sand-400">Les modifications s'appliquent aux prochains PDF générés</p>
            <button type="submit" disabled={brandSaving} className="btn-primary">
              {brandSaving ? 'Enregistrement...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
};

export default Settings;

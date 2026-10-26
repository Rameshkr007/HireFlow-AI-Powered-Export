import React, { useState } from 'react';
import { X, UserPlus, Building2, Globe, Mail, Phone, MapPin, Tag, RefreshCw } from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';

export interface ManualBuyerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CATEGORIES = [
  'Candle Stands & Lanterns',
  'Metal Candelabras',
  'Himalayan Singing Bowls',
  'Home Decor',
  'Handicrafts & Metalware',
  'Lighting & Lamps',
  'Ceramics & Vases'
];

const BUSINESS_TYPES = [
  'Importer',
  'Wholesaler',
  'Retailer',
  'Distributor',
  'Event Planner / Designer',
  'Hospitality Buyer'
];

export const ManualBuyerModal: React.FC<ManualBuyerModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { showToast } = useToast();

  const [companyName, setCompanyName] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('CA');
  const [country, setCountry] = useState('United States');
  const [product, setProduct] = useState('Candle Stands & Lanterns');
  const [businessType, setBusinessType] = useState('Importer');
  const [companyDescription, setCompanyDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please provide a valid email address.');
      return;
    }

    if (!companyName.trim()) {
      setError('Company Name is required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        company_name: companyName.trim(),
        buyer_name: buyerName.trim() || 'Procurement Executive',
        email: cleanEmail,
        phone: phone.trim() || null,
        website: website.trim() || null,
        address: address.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        country: country.trim() || 'United States',
        product: product,
        business_type: businessType,
        company_description: companyDescription.trim() || `${businessType} in ${city || country} sourcing ${product}.`,
        source_platform: 'Manual Entry'
      };

      await api.post('/api/buyers', payload);
      showToast(`Buyer "${companyName}" added successfully to database!`, 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to add buyer.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-dark-900 border border-dark-750 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-dark-800 flex items-center justify-between bg-dark-850/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-dark-50">Add Buyer Manually</h3>
              <p className="text-xs text-dark-400">Enter custom international lead details to save in central database.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-dark-400 hover:text-dark-100 hover:bg-dark-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-dark-300 font-semibold mb-1">
                Company Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Pacific Coast Decor LLC"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                className="input-field text-xs py-2"
              />
            </div>
            <div>
              <label className="block text-dark-300 font-semibold mb-1">
                Contact Person / Buyer Name
              </label>
              <input
                type="text"
                placeholder="e.g. Sarah Jenkins"
                value={buyerName}
                onChange={e => setBuyerName(e.target.value)}
                className="input-field text-xs py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-dark-300 font-semibold mb-1">
                Email Address <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="purchasing@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-field text-xs py-2"
              />
            </div>
            <div>
              <label className="block text-dark-300 font-semibold mb-1">
                Phone / WhatsApp
              </label>
              <input
                type="text"
                placeholder="e.g. +1 (310) 555-0192"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="input-field text-xs py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-dark-300 font-semibold mb-1">
                Website
              </label>
              <input
                type="text"
                placeholder="https://company.com"
                value={website}
                onChange={e => setWebsite(e.target.value)}
                className="input-field text-xs py-2"
              />
            </div>
            <div>
              <label className="block text-dark-300 font-semibold mb-1">
                Product Sourcing Vertical
              </label>
              <select
                value={product}
                onChange={e => setProduct(e.target.value)}
                className="input-field text-xs py-2 bg-dark-800"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-dark-300 font-semibold mb-1">
              Physical Street Address (US / International)
            </label>
            <input
              type="text"
              placeholder="e.g. 1420 Olympic Blvd, Los Angeles, CA 90015, USA"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="input-field text-xs py-2 font-mono"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-dark-300 font-semibold mb-1">City</label>
              <input
                type="text"
                placeholder="Los Angeles"
                value={city}
                onChange={e => setCity(e.target.value)}
                className="input-field text-xs py-2"
              />
            </div>
            <div>
              <label className="block text-dark-300 font-semibold mb-1">State / Province</label>
              <input
                type="text"
                placeholder="CA"
                value={state}
                onChange={e => setState(e.target.value)}
                className="input-field text-xs py-2"
              />
            </div>
            <div>
              <label className="block text-dark-300 font-semibold mb-1">Country</label>
              <input
                type="text"
                placeholder="United States"
                value={country}
                onChange={e => setCountry(e.target.value)}
                className="input-field text-xs py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-dark-300 font-semibold mb-1">Business Classification</label>
              <select
                value={businessType}
                onChange={e => setBusinessType(e.target.value)}
                className="input-field text-xs py-2 bg-dark-800"
              >
                {BUSINESS_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-dark-300 font-semibold mb-1">Notes / Description</label>
              <input
                type="text"
                placeholder="Special notes or sourcing requirements"
                value={companyDescription}
                onChange={e => setCompanyDescription(e.target.value)}
                className="input-field text-xs py-2"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-dark-800">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="btn-secondary py-2 px-4 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary py-2 px-6 text-xs flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 font-semibold text-white"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
              Save Buyer to Database
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Save, Building2 } from 'lucide-react';
import api from '../lib/api';
import { ExporterProfile } from '../lib/types';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useToast } from '../contexts/ToastContext';

export default function CompanyProfilePage() {
  const { showToast } = useToast();
  const [formData, setFormData] = useState<Partial<ExporterProfile>>({});
  const [tags, setTags] = useState('');

  const { data: profile, isLoading } = useQuery<ExporterProfile>({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await api.get('/api/profile');
      return res.data;
    }
  });

  useEffect(() => {
    if (profile) {
      setFormData(profile);
      setTags(profile.product_categories?.join(', ') || '');
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<ExporterProfile>) => {
      const res = await api.put('/api/profile', data);
      return res.data;
    },
    onSuccess: () => showToast('Profile saved successfully', 'success'),
    onError: () => showToast('Failed to save profile', 'error')
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData, product_categories: tags.split(',').map(t => t.trim()).filter(Boolean) };
    saveMutation.mutate(payload);
  };

  if (isLoading) return <div className="flex justify-center p-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-dark-50">Company Profile</h2>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-dark-800">
          <div className="w-16 h-16 rounded-2xl bg-primary-600/20 flex items-center justify-center">
            <Building2 className="w-8 h-8 text-primary-400" />
          </div>
          <div>
            <h3 className="font-semibold text-dark-50">{formData.company_name || 'Your Company Name'}</h3>
            <p className="text-sm text-dark-400">This information will be used in your outreach campaigns.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">Company Name *</label>
              <input type="text" className="input" value={formData.company_name || ''} onChange={e => setFormData({...formData, company_name: e.target.value})} required />
            </div>
            <div>
              <label className="label">Sender Name *</label>
              <input type="text" className="input" placeholder="e.g. John Doe" value={formData.sender_name || ''} onChange={e => setFormData({...formData, sender_name: e.target.value})} required />
            </div>
            <div>
              <label className="label">Company Email</label>
              <input type="email" className="input" value={formData.company_email || ''} onChange={e => setFormData({...formData, company_email: e.target.value})} />
            </div>
            <div>
              <label className="label">Phone Number</label>
              <input type="text" className="input" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div>
              <label className="label">Website (Optional)</label>
              <input type="text" className="input" placeholder="Leave blank (No website)" value={formData.website || ''} onChange={e => setFormData({...formData, website: e.target.value})} />
            </div>
            <div>
              <label className="label">Country</label>
              <input type="text" className="input" value={formData.country || ''} onChange={e => setFormData({...formData, country: e.target.value})} />
            </div>
          </div>

          <div>
            <label className="label">Product Categories (Comma separated)</label>
            <input type="text" className="input" placeholder="e.g. Ceramic Tiles, Granite, Marble" value={tags} onChange={e => setTags(e.target.value)} />
          </div>

          <div>
            <label className="label">Company Description</label>
            <textarea className="input min-h-[120px]" placeholder="Briefly describe your manufacturing capabilities and export experience..." value={formData.company_description || ''} onChange={e => setFormData({...formData, company_description: e.target.value})} />
          </div>

          <div className="pt-4 border-t border-dark-800 flex justify-end">
            <button type="submit" disabled={saveMutation.isPending} className="btn-primary">
              {saveMutation.isPending ? <><LoadingSpinner size="sm" /> Saving...</> : <><Save className="w-4 h-4" /> Save Profile</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

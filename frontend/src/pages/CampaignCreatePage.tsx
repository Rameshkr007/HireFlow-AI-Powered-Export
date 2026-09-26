import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save, Play } from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';

export default function CampaignCreatePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    product: '',
    target_country: '',
    target_audience: '',
    email_subject: 'Collaboration with {company_name} - {product}',
    email_body: 'Hi {buyer_name},\n\nI hope this email finds you well.\n\nMy name is {sender_name} from {exporter_company}. We specialize in manufacturing high-quality {product} and we noticed that {company_name} might be looking for reliable suppliers.\n\nWould you be open to a quick chat next week?\n\nBest regards,\n{sender_name}',
    sending_limit: 50,
    delay_seconds: 60,
  });

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = async (start: boolean) => {
    if (!formData.name) { showToast('Campaign name is required', 'error'); return; }
    setLoading(true);
    try {
      const res = await api.post('/api/campaigns', formData);
      if (start) {
        await api.post(`/api/campaigns/${res.data.id}/start`);
        showToast('Campaign started successfully', 'success');
      } else {
        showToast('Campaign draft saved', 'success');
      }
      navigate(`/campaigns/${res.data.id}`);
    } catch {
      showToast('Failed to save campaign', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/campaigns')} className="p-2 rounded-lg bg-dark-800 hover:bg-dark-700 text-dark-300">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold text-dark-50">Create Campaign</h2>
      </div>

      <div className="flex gap-2 mb-8">
        {[1, 2, 3].map(i => (
          <div key={i} className={`h-2 flex-1 rounded-full ${step >= i ? 'bg-primary-500' : 'bg-dark-800'}`} />
        ))}
      </div>

      <div className="card p-6">
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="section-title mb-4">Basic Information</h3>
            <div>
              <label className="label">Campaign Name *</label>
              <input type="text" className="input" placeholder="e.g. US Tile Distributors Q3" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <label className="label">Product / Service</label>
              <input type="text" className="input" placeholder="e.g. Ceramic Tiles" value={formData.product} onChange={e => setFormData({...formData, product: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Target Country</label>
                <input type="text" className="input" placeholder="e.g. United States" value={formData.target_country} onChange={e => setFormData({...formData, target_country: e.target.value})} />
              </div>
              <div>
                <label className="label">Target Audience</label>
                <select className="input bg-dark-800" value={formData.target_audience} onChange={e => setFormData({...formData, target_audience: e.target.value})}>
                  <option value="All">All High Priority Leads</option>
                  <option value="Distributor">Distributors</option>
                  <option value="Wholesaler">Wholesalers</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="section-title mb-4">Email Template</h3>
            <div className="bg-dark-800 p-3 rounded-lg text-sm text-dark-300 mb-4">
              <span className="font-semibold text-primary-400">Available Variables:</span> {`{buyer_name}, {company_name}, {product}, {sender_name}, {exporter_company}`}
            </div>
            <div>
              <label className="label">Email Subject</label>
              <input type="text" className="input" value={formData.email_subject} onChange={e => setFormData({...formData, email_subject: e.target.value})} />
            </div>
            <div>
              <label className="label">Email Body</label>
              <textarea className="input min-h-[200px] font-mono text-sm" value={formData.email_body} onChange={e => setFormData({...formData, email_body: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-dark-800">
              <div>
                <label className="label">Daily Sending Limit</label>
                <input type="number" className="input" value={formData.sending_limit} onChange={e => setFormData({...formData, sending_limit: parseInt(e.target.value)})} />
              </div>
              <div>
                <label className="label">Delay Between Emails (seconds)</label>
                <input type="number" className="input" value={formData.delay_seconds} onChange={e => setFormData({...formData, delay_seconds: parseInt(e.target.value)})} />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h3 className="section-title">Review & Preview</h3>
            
            <div className="grid grid-cols-2 gap-4 p-4 bg-dark-800/50 rounded-lg text-sm border border-dark-700">
              <div><span className="text-dark-500">Name:</span> <span className="text-dark-100">{formData.name}</span></div>
              <div><span className="text-dark-500">Target:</span> <span className="text-dark-100">{formData.target_country || 'Global'} - {formData.target_audience}</span></div>
              <div><span className="text-dark-500">Settings:</span> <span className="text-dark-100">{formData.sending_limit} max/day, {formData.delay_seconds}s delay</span></div>
            </div>

            <div className="border border-dark-700 rounded-lg overflow-hidden">
              <div className="bg-dark-800 p-3 border-b border-dark-700">
                <div className="text-xs text-dark-500 mb-1">Subject</div>
                <div className="text-sm font-medium text-dark-100">{formData.email_subject}</div>
              </div>
              <div className="p-4 bg-dark-900 min-h-[200px]">
                <pre className="text-sm text-dark-200 whitespace-pre-wrap font-sans">{formData.email_body}</pre>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-8 pt-6 border-t border-dark-800">
          {step > 1 ? (
            <button onClick={handleBack} className="btn-secondary"><ArrowLeft className="w-4 h-4" /> Back</button>
          ) : <div></div>}
          
          <div className="flex gap-3">
            {step < 3 ? (
              <button onClick={handleNext} className="btn-primary">Next <ArrowRight className="w-4 h-4" /></button>
            ) : (
              <>
                <button onClick={() => handleSubmit(false)} disabled={loading} className="btn-secondary"><Save className="w-4 h-4" /> Save Draft</button>
                <button onClick={() => handleSubmit(true)} disabled={loading} className="btn-primary bg-green-600 hover:bg-green-500 text-white"><Play className="w-4 h-4" /> Start Campaign</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

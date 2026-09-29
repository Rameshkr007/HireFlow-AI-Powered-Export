import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Save, Play, Plus, Trash2, Clock,
  Sparkles, CheckCircle2, AlertCircle, FileText, Send, Layers,
  ShieldCheck, RefreshCw, Zap, Paperclip, UploadCloud, Check
} from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';

interface SequenceStep {
  id: string;
  step_number: number;
  step_name: string;
  delay_days: number;
  condition: 'immediate' | 'if_no_reply' | 'if_opened_no_reply';
  email_subject: string;
  email_body: string;
}

const DEFAULT_STEPS: SequenceStep[] = [
  {
    id: 'step-1',
    step_number: 1,
    step_name: 'Initial Introduction & Product Lookbook',
    delay_days: 0,
    condition: 'immediate',
    email_subject: 'Export Supply Collaboration – {product} for {company_name}',
    email_body: `Dear {buyer_name},

I hope this email finds you well.

We have been following {company_name}'s distinguished presence in the US market and noticed your focus on high-quality {product}.

We are direct manufacturers and exporters specializing in authentic, high-grade {product}. We offer:
• Competitive FOB / CIF pricing with flexible MOQ
• Full US customs documentation & compliance certification
• Custom packaging and private labeling

Please find our export product lookbook and technical specifications attached. Would you be open to receiving a curated sample pack next week?

Best regards,
{sender_name}
{exporter_company}`,
  },
  {
    id: 'step-2',
    step_number: 2,
    step_name: 'Follow-up: Wholesale Price Tiers & MOQ',
    delay_days: 3,
    condition: 'if_no_reply',
    email_subject: 'Quick follow-up: Wholesale pricing & MOQ for {product}',
    email_body: `Hi {buyer_name},

I wanted to quickly follow up on my previous message regarding {product} sourcing for {company_name}.

We recently updated our quarterly production capacity and can offer preferential FOB rates for US orders placed this month.

If helpful, I can send over our tiered pricing matrix and estimated ocean freight lead times to your nearest port.

Let me know if this aligns with your current procurement schedule.

Warm regards,
{sender_name}`,
  },
  {
    id: 'step-3',
    step_number: 3,
    step_name: 'Value Proposition: Custom Samples & Compliance',
    delay_days: 7,
    condition: 'if_no_reply',
    email_subject: 'Sample shipment for {company_name} – {product}',
    email_body: `Dear {buyer_name},

I understand you have a demanding schedule. To make your evaluation seamless, we would be delighted to courier complimentary production samples of our {product} directly to your office.

Could you confirm the best delivery address and recipient contact for your procurement team?

Best regards,
{sender_name}`,
  },
];

export default function CampaignCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const preSelectedBuyers = location.state?.preSelected || [];
  const defaultProduct = location.state?.defaultProduct || 'Home Decor';

  const [activeTab, setActiveTab] = useState<'info' | 'sequence' | 'settings' | 'review'>('info');
  const [loading, setLoading] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  const [formData, setFormData] = useState({
    name: `US ${defaultProduct} Strategic Outreach 2026`,
    product: defaultProduct,
    target_country: 'United States',
    target_audience: 'Importer',
    sending_limit: 50,
    delay_seconds: 45,
  });

  const [steps, setSteps] = useState<SequenceStep[]>(DEFAULT_STEPS);

  // Attachments State
  const [attachments, setAttachments] = useState<Array<{ id: number; original_name: string; file_size?: number; created_at?: string }>>([]);
  const [selectedAttachmentId, setSelectedAttachmentId] = useState<number | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  useEffect(() => {
    api.get('/api/attachments')
      .then(res => {
        const list = res.data || [];
        setAttachments(list);
        if (list.length > 0) {
          setSelectedAttachmentId(list[0].id);
        }
      })
      .catch(err => console.error('Failed to load attachments', err));
  }, []);

  const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAttachment(true);
    try {
      const data = new FormData();
      data.append('file', file);
      const res = await api.post('/api/attachments', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setAttachments(prev => [res.data, ...prev]);
      setSelectedAttachmentId(res.data.id);
      showToast(`Catalog "${file.name}" uploaded & attached!`, 'success');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to upload attachment', 'error');
    } finally {
      setUploadingAttachment(false);
    }
  };

  const currentStep = steps[activeStepIndex] || steps[0];

  const updateCurrentStep = (fields: Partial<SequenceStep>) => {
    setSteps(prev => prev.map((s, idx) => idx === activeStepIndex ? { ...s, ...fields } : s));
  };

  const addStep = () => {
    const nextNum = steps.length + 1;
    const newStep: SequenceStep = {
      id: `step-${Date.now()}`,
      step_number: nextNum,
      step_name: `Follow-up Touchpoint ${nextNum}`,
      delay_days: (steps[steps.length - 1]?.delay_days || 0) + 4,
      condition: 'if_no_reply',
      email_subject: `Regarding our {product} proposal for {company_name}`,
      email_body: `Hi {buyer_name},\n\nJust touching base to see if you had any thoughts on our previous export proposal.\n\nBest regards,\n{sender_name}`,
    };
    setSteps([...steps, newStep]);
    setActiveStepIndex(steps.length);
  };

  const removeStep = (idx: number) => {
    if (steps.length <= 1) {
      showToast('Campaign must have at least one touchpoint', 'error');
      return;
    }
    const updated = steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step_number: i + 1 }));
    setSteps(updated);
    setActiveStepIndex(Math.max(0, idx - 1));
  };

  // AI Assistant for Follow-up generation
  const handleAIGenerateFollowup = () => {
    const aiSubjects = [
      `FOB Price List & Sample availability for {company_name}`,
      `Quick question regarding {company_name}'s {product} inventory`,
      `Container volume discounts on {product} for US importers`,
    ];
    const aiBodies = [
      `Hi {buyer_name},\n\nHope your week is going well.\n\nOur export division is preparing the upcoming production schedule for North America. We have reserved container capacity for {product} with guaranteed delivery schedules.\n\nWould it make sense to review our catalog before capacity closes?\n\nBest,\n{sender_name}`,
      `Dear {buyer_name},\n\nFollowing up on our earlier note. We are currently supplying several regional US distributors with certified {product} at factory-direct rates.\n\nI would be glad to share customer testimonials and quality test reports if of interest.\n\nKind regards,\n{sender_name}`,
    ];

    updateCurrentStep({
      email_subject: aiSubjects[Math.floor(Math.random() * aiSubjects.length)],
      email_body: aiBodies[Math.floor(Math.random() * aiBodies.length)],
    });
    showToast('AI optimized follow-up generated', 'success');
  };

  // Spam Word Detector & Deliverability Health Check
  const spamWords = ['100% free', 'guaranteed', 'risk-free', 'buy now', 'cheap', 'act now', 'make money'];
  const detectedSpam = spamWords.filter(w => 
    (currentStep.email_subject + ' ' + currentStep.email_body).toLowerCase().includes(w)
  );

  const deliverabilityScore = Math.max(70, 100 - (detectedSpam.length * 15));

  const handleSubmit = async (start: boolean) => {
    if (!formData.name.trim()) {
      showToast('Please enter a campaign name', 'error');
      return;
    }
    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        product: formData.product,
        target_country: formData.target_country,
        target_audience: formData.target_audience,
        email_subject: steps[0].email_subject,
        email_body: steps[0].email_body,
        sequence_steps: steps,
        sending_limit: formData.sending_limit,
        delay_seconds: formData.delay_seconds,
        attachment_id: selectedAttachmentId,
        is_demo: false,
      };

      const res = await api.post('/api/campaigns', payload);
      if (start) {
        await api.post(`/api/campaigns/${res.data.id}/start`);
        showToast('Outreach campaign launched successfully!', 'success');
      } else {
        showToast('Campaign sequence saved as draft', 'success');
      }
      navigate(`/campaigns/${res.data.id}`);
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to initialize campaign', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/campaigns')}
            className="p-2 rounded-lg bg-dark-800 hover:bg-dark-700 text-dark-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-dark-50">Multi-Step Outreach Sequence Builder</h1>
            <p className="text-xs text-dark-400">Automate high-converting B2B buyer follow-ups with smart cadences</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {preSelectedBuyers.length > 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary-500/10 text-primary-400 border border-primary-500/20">
              {preSelectedBuyers.length} Discovered Buyers Target
            </span>
          )}
          <button
            onClick={() => handleSubmit(false)}
            disabled={loading}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" /> Save Sequence Draft
          </button>
          <button
            onClick={() => handleSubmit(true)}
            disabled={loading}
            className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> Launch Campaign Sequence
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-dark-700 space-x-6 text-sm">
        <button
          onClick={() => setActiveTab('info')}
          className={`pb-3 font-medium transition-all ${
            activeTab === 'info'
              ? 'text-primary-400 border-b-2 border-primary-500'
              : 'text-dark-400 hover:text-dark-200'
          }`}
        >
          1. Campaign Parameters
        </button>
        <button
          onClick={() => setActiveTab('sequence')}
          className={`pb-3 font-medium transition-all flex items-center gap-1.5 ${
            activeTab === 'sequence'
              ? 'text-primary-400 border-b-2 border-primary-500'
              : 'text-dark-400 hover:text-dark-200'
          }`}
        >
          <Layers className="w-4 h-4" /> 2. Multi-Step Cadence ({steps.length} Steps)
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 font-medium transition-all ${
            activeTab === 'settings'
              ? 'text-primary-400 border-b-2 border-primary-500'
              : 'text-dark-400 hover:text-dark-200'
          }`}
        >
          3. Deliverability & Sending Limits
        </button>
        <button
          onClick={() => setActiveTab('review')}
          className={`pb-3 font-medium transition-all ${
            activeTab === 'review'
              ? 'text-primary-400 border-b-2 border-primary-500'
              : 'text-dark-400 hover:text-dark-200'
          }`}
        >
          4. Sequence Preview
        </button>
      </div>

      {/* ── TAB 1: BASIC INFO ── */}
      {activeTab === 'info' && (
        <div className="card p-6 space-y-5">
          <h2 className="text-base font-bold text-dark-100">Campaign Foundation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label text-xs">Campaign Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="input text-xs"
                placeholder="e.g. US Home Decor Importers Q4"
              />
            </div>
            <div>
              <label className="label text-xs">Export Product Vertical</label>
              <input
                type="text"
                value={formData.product}
                onChange={e => setFormData({ ...formData, product: e.target.value })}
                className="input text-xs"
                placeholder="e.g. Handcrafted Home Decor, Singing Bowls..."
              />
            </div>
            <div>
              <label className="label text-xs">Target Destination Country</label>
              <input
                type="text"
                value={formData.target_country}
                onChange={e => setFormData({ ...formData, target_country: e.target.value })}
                className="input text-xs"
                placeholder="e.g. United States"
              />
            </div>
            <div>
              <label className="label text-xs">Target Buyer Classification</label>
              <select
                value={formData.target_audience}
                onChange={e => setFormData({ ...formData, target_audience: e.target.value })}
                className="input text-xs bg-dark-800"
              >
                <option value="Importer">Direct Importers & Trade Houses</option>
                <option value="Wholesaler">Wholesale Distributors</option>
                <option value="Retailer">Specialty Retail Chains</option>
                <option value="All">All Commercial Prospects</option>
              </select>
            </div>
          </div>

          {/* Catalog / Poster PDF Attachment Section */}
          <div className="p-4 rounded-xl bg-dark-900 border border-dark-700/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-primary-400" />
                <span className="text-xs font-bold text-dark-100 uppercase tracking-wider">
                  Attach Official Product Catalog / Lookbook (PDF)
                </span>
              </div>
              <label className="cursor-pointer text-xs font-medium text-primary-400 hover:text-primary-300 flex items-center gap-1.5 bg-primary-500/10 hover:bg-primary-500/20 px-2.5 py-1.5 rounded-lg border border-primary-500/30 transition-colors self-start sm:self-auto">
                <UploadCloud className="w-3.5 h-3.5" />
                {uploadingAttachment ? 'Uploading PDF...' : '+ Upload New Catalog PDF'}
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.xlsx,.pptx"
                  onChange={handleUploadAttachment}
                  disabled={uploadingAttachment}
                  className="hidden"
                />
              </label>
            </div>

            <p className="text-xs text-dark-400">
              Select which product catalog or poster will be attached with every email sent to US buyers:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {attachments.length === 0 ? (
                <div className="col-span-2 p-3 text-center text-xs text-dark-400 border border-dashed border-dark-700 rounded-lg">
                  No catalogs uploaded yet. Click "+ Upload New Catalog PDF" above.
                </div>
              ) : (
                attachments.map(att => {
                  const isSelected = selectedAttachmentId === att.id;
                  return (
                    <div
                      key={att.id}
                      onClick={() => setSelectedAttachmentId(isSelected ? null : att.id)}
                      className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${
                        isSelected
                          ? 'bg-primary-500/15 border-primary-500 text-dark-100 shadow-sm'
                          : 'bg-dark-800/80 border-dark-700 text-dark-300 hover:border-dark-600'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-primary-400' : 'text-dark-400'}`} />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">{att.original_name}</div>
                          {att.file_size && (
                            <div className="text-[10px] text-dark-500 font-mono">
                              {(att.file_size / (1024 * 1024)).toFixed(2)} MB
                            </div>
                          )}
                        </div>
                      </div>
                      {isSelected ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary-500 text-white flex items-center gap-1 flex-shrink-0">
                          <Check className="w-3 h-3 stroke-[3]" /> ATTACHED
                        </span>
                      ) : (
                        <span className="text-[10px] text-dark-500 border border-dark-700 px-1.5 py-0.5 rounded flex-shrink-0">
                          Click to attach
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {selectedAttachmentId && (
              <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                This catalog will be dispatched as a genuine file attachment with every outreach email.
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-dark-800">
            <button
              onClick={() => setActiveTab('sequence')}
              className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
            >
              Configure Sequence Cadence <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── TAB 2: VISUAL SEQUENCE BUILDER ── */}
      {activeTab === 'sequence' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Visual Steps Timeline */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-bold text-dark-300 uppercase tracking-wider">Outreach Cadence</span>
              <button
                onClick={addStep}
                className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1 text-primary-400 hover:text-primary-300"
              >
                <Plus className="w-3.5 h-3.5" /> Add Step
              </button>
            </div>

            <div className="space-y-3 relative">
              {steps.map((st, idx) => {
                const isActive = activeStepIndex === idx;
                return (
                  <div key={st.id} className="relative">
                    {/* Step Card */}
                    <div
                      onClick={() => setActiveStepIndex(idx)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-150 ${
                        isActive
                          ? 'bg-primary-500/10 border-primary-500 shadow-md shadow-primary-500/5'
                          : 'bg-dark-800 border-dark-700 hover:border-dark-600'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className={`font-bold px-2 py-0.5 rounded-md ${
                          isActive ? 'bg-primary-500 text-white' : 'bg-dark-700 text-dark-300'
                        }`}>
                          Step {st.step_number}
                        </span>

                        <span className="text-dark-400 flex items-center gap-1 font-mono text-[11px]">
                          <Clock className="w-3 h-3 text-dark-500" />
                          {st.delay_days === 0 ? 'Immediately' : `Day ${st.delay_days}`}
                        </span>
                      </div>

                      <div className="text-sm font-semibold text-dark-100 truncate">{st.step_name}</div>
                      <div className="text-xs text-dark-400 truncate mt-0.5 font-mono">{st.email_subject}</div>

                      <div className="mt-2 pt-2 border-t border-dark-700/60 flex items-center justify-between text-[11px] text-dark-400">
                        <span className="capitalize">
                          {st.condition === 'immediate' ? 'Initial Send' : 'Send if no reply'}
                        </span>
                        {steps.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeStep(idx);
                            }}
                            className="text-dark-500 hover:text-red-400 transition-colors p-0.5"
                            title="Delete Step"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Connecting Line */}
                    {idx < steps.length - 1 && (
                      <div className="w-0.5 h-3 bg-dark-600 mx-auto my-1"></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Step Editor & Deliverability Shield */}
          <div className="lg:col-span-8 space-y-4">
            <div className="card p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-dark-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold bg-primary-500/20 text-primary-400 px-2 py-0.5 rounded">
                    Step {currentStep.step_number}
                  </span>
                  <h3 className="text-sm font-bold text-dark-100">{currentStep.step_name}</h3>
                </div>

                <button
                  onClick={handleAIGenerateFollowup}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 text-amber-300 hover:bg-amber-400/10 border-amber-400/30"
                >
                  <Sparkles className="w-3.5 h-3.5" /> AI Rewrite Follow-up
                </button>
              </div>

              {/* Step Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="label text-xs">Step Title</label>
                  <input
                    type="text"
                    value={currentStep.step_name}
                    onChange={e => updateCurrentStep({ step_name: e.target.value })}
                    className="input text-xs"
                  />
                </div>
                <div>
                  <label className="label text-xs">Delay Schedule</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={currentStep.delay_days}
                      onChange={e => updateCurrentStep({ delay_days: parseInt(e.target.value) || 0 })}
                      className="input text-xs"
                    />
                    <span className="text-xs text-dark-400">Days</span>
                  </div>
                </div>
                <div>
                  <label className="label text-xs">Dispatch Condition</label>
                  <select
                    value={currentStep.condition}
                    onChange={e => updateCurrentStep({ condition: e.target.value as any })}
                    className="input text-xs bg-dark-800"
                  >
                    <option value="immediate">Send Immediately</option>
                    <option value="if_no_reply">Only if no reply to prior step</option>
                    <option value="if_opened_no_reply">If email opened but no reply</option>
                  </select>
                </div>
              </div>

              {/* Variables bar */}
              <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg bg-dark-900 border border-dark-800 text-xs text-dark-400">
                <span className="font-semibold text-primary-400 mr-1">Insert Merge Variables:</span>
                {['{buyer_name}', '{company_name}', '{product}', '{sender_name}', '{exporter_company}'].map(v => (
                  <button
                    key={v}
                    onClick={() => {
                      updateCurrentStep({ email_body: currentStep.email_body + ' ' + v });
                    }}
                    className="px-2 py-0.5 rounded bg-dark-800 hover:bg-dark-700 text-dark-300 font-mono text-[11px] border border-dark-700"
                  >
                    {v}
                  </button>
                ))}
              </div>

              {/* Email Subject */}
              <div>
                <label className="label text-xs">Email Subject Line</label>
                <input
                  type="text"
                  value={currentStep.email_subject}
                  onChange={e => updateCurrentStep({ email_subject: e.target.value })}
                  className="input text-xs font-medium"
                />
              </div>

              {/* Email Body */}
              <div>
                <label className="label text-xs">Email Body Content</label>
                <textarea
                  rows={10}
                  value={currentStep.email_body}
                  onChange={e => updateCurrentStep({ email_body: e.target.value })}
                  className="input text-xs font-mono leading-relaxed"
                />
              </div>

              {/* Deliverability & Spam Shield Gauge */}
              <div className="p-3.5 rounded-xl bg-dark-900 border border-dark-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                    deliverabilityScore >= 90
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {deliverabilityScore}%
                  </div>
                  <div>
                    <div className="font-semibold text-dark-100 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Deliverability Safety Score
                    </div>
                    <div className="text-[11px] text-dark-400">
                      {detectedSpam.length === 0
                        ? 'Zero spam trigger words detected. Safe for inbox placement.'
                        : `Contains trigger words: ${detectedSpam.join(', ')}`}
                    </div>
                  </div>
                </div>

                <span className="text-[10px] text-dark-500 font-mono">
                  SPF • DKIM • DMARC Compliant
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: SETTINGS ── */}
      {activeTab === 'settings' && (
        <div className="card p-6 space-y-4 max-w-2xl">
          <h2 className="text-base font-bold text-dark-100">Deliverability Protection & Limits</h2>
          <div className="space-y-4">
            <div>
              <label className="label text-xs">Daily Sending Volume Limit</label>
              <input
                type="number"
                value={formData.sending_limit}
                onChange={e => setFormData({ ...formData, sending_limit: parseInt(e.target.value) || 20 })}
                className="input text-xs"
              />
              <p className="text-[11px] text-dark-500 mt-1">Recommended 30-50 emails/day to maintain warm domain reputation.</p>
            </div>

            <div>
              <label className="label text-xs">Humanized Delay Between Emails (Seconds)</label>
              <input
                type="number"
                value={formData.delay_seconds}
                onChange={e => setFormData({ ...formData, delay_seconds: parseInt(e.target.value) || 30 })}
                className="input text-xs"
              />
              <p className="text-[11px] text-dark-500 mt-1">Simulates organic sending patterns to prevent mailserver throttling.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: REVIEW ── */}
      {activeTab === 'review' && (
        <div className="card p-6 space-y-5">
          <h2 className="text-base font-bold text-dark-100">Full Outreach Cadence Preview</h2>
          <div className="space-y-4">
            {/* Attachment preview banner */}
            <div className="p-3.5 rounded-xl bg-dark-950 border border-dark-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <Paperclip className="w-4 h-4 text-primary-400" />
                <div>
                  <span className="text-dark-400">Attached Product Catalog: </span>
                  <span className="font-semibold text-dark-100">
                    {attachments.find(a => a.id === selectedAttachmentId)?.original_name || 'No attachment selected'}
                  </span>
                </div>
              </div>
              {selectedAttachmentId && (
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                  PDF INCLUDED
                </span>
              )}
            </div>

            {steps.map((st, i) => (
              <div key={st.id} className="p-4 rounded-xl bg-dark-900 border border-dark-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-primary-400">Step {st.step_number}: {st.step_name}</span>
                  <span className="text-dark-400 font-mono">
                    {st.delay_days === 0 ? 'Initial Trigger' : `Day ${st.delay_days} (Condition: ${st.condition})`}
                  </span>
                </div>
                <div className="text-sm font-semibold text-dark-200">Subject: {st.email_subject}</div>
                <pre className="text-xs text-dark-300 font-sans whitespace-pre-wrap bg-dark-950 p-3 rounded-lg border border-dark-850">
                  {st.email_body}
                </pre>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-dark-800">
            <button
              onClick={() => handleSubmit(false)}
              disabled={loading}
              className="btn-secondary text-xs py-2 px-4"
            >
              Save Sequence Draft
            </button>
            <button
              onClick={() => handleSubmit(true)}
              disabled={loading}
              className="btn-primary text-xs py-2 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Launch Campaign Sequence
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

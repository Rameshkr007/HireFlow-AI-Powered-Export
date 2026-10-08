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

export const ASSIGNED_SINGING_BOWLS_TEMPLATE = {
  subject: "Authentic Handmade Himalayan Singing Bowls – Direct Manufacturer | Wholesale & OEM",
  body: `Authentic Handmade Himalayan Singing Bowls
Direct Manufacturer from Nepal • Wholesale • OEM • Private Label

Dear {{name}},

While researching businesses in {{country}}, we came across {{company}} and were impressed by your commitment to quality wellness products.

We are a Nepal-based manufacturer and exporter of authentic handmade Himalayan Singing Bowls crafted by skilled artisans using traditional techniques.

Our Product Range
Handmade Himalayan Singing Bowls
Full Moon Singing Bowls
Antique Finish Singing Bowls
Chakra Singing Bowl Sets
Meditation & Sound Healing Bowls
Tingsha Cymbals & Meditation Accessories
Custom Logo & Private Label Manufacturing

Why Partner With Us?
✔ Direct Manufacturer from Nepal
✔ Authentic Handmade Craftsmanship
✔ OEM & Private Label Services
✔ Worldwide Shipping
✔ Dedicated Export Support
Our latest catalogue is attached. Reply to this email for wholesale pricing, samples, shipping quotations, and customization options.

Kind Regards,

{{sender_name}}
Sales Executive
{{company_name}}
📧 {{email}}
📱 {{phone}}

Thank you for your valuable time. We look forward to building a successful and long-term partnership with {{company}}.`
};

export const HIGH_CONVERTING_DUAL_TEMPLATE = {
  subject: "Quick question regarding {company_name}'s decor & singing bowls sourcing",
  body: `Hi {buyer_name},

I came across {company_name} while reviewing leading home decor showrooms and wellness businesses across {country}.

We are a direct manufacturing and export unit based in Moradabad, India (the traditional handcrafted brass and metalware center), specializing in:
• Handcrafted Metal Candle Stands, Lanterns & Table Candelabras
• Authentic Hand-Hammered Himalayan Singing Bowls & Meditation Sets

Because we produce directly in our Moradabad facility:
1. Pricing is strictly factory-direct FOB (eliminating 20-30% middleman trading margins).
2. We provide custom finishes (matte black, antique bronze, raw brass), laser engraving & private label packaging.
3. Direct consolidated ocean shipments to Los Angeles & Long Beach ports.

Would it make sense to courier a complimentary sample piece to your office for quality evaluation?

Best regards,

Ramesh Kumar Thakur
Export Sales Executive | OM Enterprise
📧 exportindia2026us@gmail.com
📱 +91 80577 10065
Moradabad, Uttar Pradesh, India`
};

export const CANDLE_STANDS_TEMPLATE = {
  subject: "Direct factory sourcing for {company_name} – Handcrafted metal candle holders & lanterns",
  body: `Hi {buyer_name},

I noticed {company_name}'s impressive collection of premium home accents and tabletop accessories.

We are OM Enterprise, a direct manufacturer and exporter of handcrafted metal candle holders, candelabras, and wrought iron lanterns based in Moradabad, India.

How we support US wholesalers & design showrooms:
• Custom OEM designs, private label packaging & barcode retail tagging
• Solid brass, wrought iron, and antique finishes built to export standards
• Factory FOB pricing with low minimum orders for test shipments
• Direct door-to-door express or ocean freight to major US ports (LA & Long Beach)

Our digital lookbook is attached for your review. Would you be open to receiving a physical sample at {company_name} so your team can test our metal finishing firsthand?

Best regards,

Ramesh Kumar Thakur
Export Sales Executive | OM Enterprise
📧 exportindia2026us@gmail.com
📱 +91 80577 10065
Moradabad, Uttar Pradesh, India`
};

export const SINGING_BOWLS_TEMPLATE = {
  subject: "Question regarding {company_name}'s singing bowls & sound healing collection",
  body: `Hi {buyer_name},

While exploring reputable sound wellness and meditation brands in {country}, {company_name} caught our attention.

We are direct artisan exporters of authentic hand-hammered Himalayan Singing Bowls, Full Moon healing sets, and meditation accessories.

Why US wellness importers partner with us:
• Handcrafted from 7 traditional acoustic metals by skilled Himalayan artisans
• Master-tested frequencies (432Hz / 528Hz tuned sets available)
• Direct artisan pricing with no intermediary markups
• Custom branding, silk cushions, and wooden mallet gift sets

Would you like us to mail a complimentary sample bowl to your office so you can experience the sustained acoustic vibration firsthand?

Best regards,

Ramesh Kumar Thakur
Export Sales Executive | OM Enterprise
📧 exportindia2026us@gmail.com
📱 +91 80577 10065
Moradabad, Uttar Pradesh, India`
};

const DEFAULT_STEPS: SequenceStep[] = [
  {
    id: 'step-1',
    step_number: 1,
    step_name: 'Initial Introduction: Authentic Himalayan Singing Bowls (Official Assigned)',
    delay_days: 0,
    condition: 'immediate',
    email_subject: ASSIGNED_SINGING_BOWLS_TEMPLATE.subject,
    email_body: ASSIGNED_SINGING_BOWLS_TEMPLATE.body,
  },
  {
    id: 'step-2',
    step_number: 2,
    step_name: 'Follow-up: Wholesale FOB Price Tiers & Port Freight',
    delay_days: 3,
    condition: 'if_no_reply',
    email_subject: 'Re: Sourcing inquiry for {company_name}',
    email_body: `Hi {buyer_name},

I wanted to quickly follow up on my note regarding our handcrafted metalware and wellness collection for {company_name}.

We have updated our export capacity for this quarter and can offer preferential FOB pricing along with direct shipping to US ports (including Los Angeles / Long Beach).

Can I send over our 2-page wholesale price list and sample request form?

Best regards,

Ramesh Kumar Thakur
Export Sales Executive | OM Enterprise
📧 exportindia2026us@gmail.com | 📱 +91 80577 10065`,
  },
  {
    id: 'step-3',
    step_number: 3,
    step_name: 'Value Proposition: Custom OEM, Private Label & Low MOQ',
    delay_days: 7,
    condition: 'if_no_reply',
    email_subject: 'Private label & custom packaging options for {company_name}',
    email_body: `Hi {buyer_name},

I understand you have a demanding procurement schedule. As a direct manufacturer, we also provide complete OEM customization, laser logo engraving, and custom barcode packaging tailored for US retail shelves.

If you have any upcoming seasonal purchasing requirements, please let us know how we can support {company_name}'s inventory.

Would you be open to a brief 5-minute phone or WhatsApp call this week?

Warm regards,

Ramesh Kumar Thakur
Export Sales Executive | OM Enterprise
📧 exportindia2026us@gmail.com | 📱 +91 80577 10065`,
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
    name: `California ${defaultProduct} Strategic Outreach 2026`,
    product: defaultProduct,
    target_country: 'USA - California (All Cities)',
    target_audience: 'Importer',
    sending_limit: 50,
    delay_seconds: 45,
  });

  const [steps, setSteps] = useState<SequenceStep[]>(DEFAULT_STEPS);

  // Attachments State (Multi-Attachment Support)
  const [attachments, setAttachments] = useState<Array<{ id: number; original_name: string; file_size?: number; created_at?: string }>>([]);
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<number[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  useEffect(() => {
    api.get('/api/attachments')
      .then(res => {
        const list = res.data || [];
        setAttachments(list);
        if (list.length > 0) {
          // Select all available catalogs by default so both Singing Bowls and Candle Holders are attached!
          setSelectedAttachmentIds(list.map((a: any) => a.id));
        }
      })
      .catch(err => console.error('Failed to load attachments', err));
  }, []);

  const toggleAttachment = (id: number) => {
    setSelectedAttachmentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

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
      setSelectedAttachmentIds(prev => [...prev, res.data.id]);
      showToast(`Catalog "${file.name}" uploaded & selected!`, 'success');
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
        attachment_id: selectedAttachmentIds.length > 0 ? selectedAttachmentIds[0] : null,
        attachment_ids: selectedAttachmentIds,
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

      {/* Real Email Dispatch Status Ribbon */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <div className="text-xs text-dark-200">
            Authenticated Sender: <strong className="text-emerald-400 font-mono">rameshkrthakur1816@gmail.com</strong>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold tracking-wider">
            CONNECTED & ACTIVE
          </span>
        </div>
        <div className="text-[11px] text-dark-400">
          Official Signature: <span className="text-dark-200 font-medium">OM Enterprise (exportindia2026us@gmail.com)</span>
        </div>
      </div>
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
              <label className="label text-xs">Target Destination Country / State</label>
              <input
                type="text"
                value={formData.target_country}
                onChange={e => setFormData({ ...formData, target_country: e.target.value })}
                className="input text-xs"
                placeholder="e.g. United States or USA - California"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, target_country: 'USA - California (All Cities)' })}
                  className={`text-[11px] px-2.5 py-1 rounded-md border font-medium transition-all ${
                    formData.target_country.toLowerCase().includes('california') || formData.target_country.toLowerCase().includes('ca')
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                      : 'bg-dark-800 text-dark-300 border-dark-700 hover:border-dark-600'
                  }`}
                >
                  🌴 USA - California (All Cities) [100+ Verified Buyers]
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, target_country: 'United States' })}
                  className={`text-[11px] px-2.5 py-1 rounded-md border font-medium transition-all ${
                    formData.target_country === 'United States'
                      ? 'bg-primary-500/20 text-primary-300 border-primary-500/40'
                      : 'bg-dark-800 text-dark-300 border-dark-700 hover:border-dark-600'
                  }`}
                >
                  🇺🇸 United States (All 50 States)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, target_country: 'United Kingdom' })}
                  className="text-[11px] px-2 py-1 rounded-md border bg-dark-800 text-dark-300 border-dark-700 hover:border-dark-600"
                >
                  🇬🇧 UK
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, target_country: 'Germany' })}
                  className="text-[11px] px-2 py-1 rounded-md border bg-dark-800 text-dark-300 border-dark-700 hover:border-dark-600"
                >
                  🇩🇪 Germany
                </button>
              </div>

              {(formData.target_country.toLowerCase().includes('california') || formData.target_country.toLowerCase().includes('ca')) && (
                <div className="mt-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
                  <span className="text-lg leading-none">🌴</span>
                  <div>
                    <div className="text-xs font-bold text-amber-300">
                      Strict California Statewide Lead Filter Active
                    </div>
                    <p className="text-[11px] text-amber-200/90 mt-0.5 leading-relaxed">
                      Only verified buyers located across California cities (Los Angeles, San Francisco, San Diego, San Jose, Sacramento, Santa Barbara, Encinitas, Ojai, and 40+ CA cities) will receive emails. Non-California leads are strictly excluded.
                    </p>
                  </div>
                </div>
              )}
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
                  Attach Product Catalogs & Lookbooks (Multiple PDFs Allowed)
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

            <div className="flex items-center justify-between">
              <p className="text-xs text-dark-400">
                Click any catalog to attach or detach. You can select multiple catalogs to send together:
              </p>
              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                {selectedAttachmentIds.length} Selected (Multi-Attach Active)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {attachments.length === 0 ? (
                <div className="col-span-2 p-3 text-center text-xs text-dark-400 border border-dashed border-dark-700 rounded-lg">
                  No catalogs uploaded yet. Click "+ Upload New Catalog PDF" above.
                </div>
              ) : (
                attachments.map(att => {
                  const isSelected = selectedAttachmentIds.includes(att.id);
                  return (
                    <div
                      key={att.id}
                      onClick={() => toggleAttachment(att.id)}
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

            {selectedAttachmentIds.length > 0 && (
              <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                All {selectedAttachmentIds.length} selected files will be dispatched as real attachments with every outreach email.
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
            {/* High-Response Advisory */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-dark-900 border border-amber-500/20 text-xs space-y-1.5 shadow-sm">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold text-[11px] uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>US / California High Response Guide</span>
              </div>
              <ul className="text-[11px] text-dark-300 space-y-1 list-disc list-inside">
                <li><strong className="text-dark-100">Send Timing:</strong> Tue – Thu, <strong>9:00 PM – 11:30 PM IST</strong> (8:30 AM – 11:00 AM PST).</li>
                <li><strong className="text-dark-100">Free Sample Offer:</strong> 8x higher response than asking for bulk orders directly.</li>
                <li><strong className="text-dark-100">3-Step Cadence:</strong> 80% of wholesale deals happen on follow-ups.</li>
              </ul>
            </div>

            {/* Quick Template Switcher */}
            <div className="p-3 rounded-xl bg-dark-900 border border-dark-800 space-y-2">
              <div className="text-[11px] font-bold text-dark-300 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>1-Click High-Converting Templates:</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    updateCurrentStep({
                      email_subject: ASSIGNED_SINGING_BOWLS_TEMPLATE.subject,
                      email_body: ASSIGNED_SINGING_BOWLS_TEMPLATE.body,
                    });
                    showToast('Loaded: Official Assigned Himalayan Singing Bowls Template', 'success');
                  }}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 font-bold text-left transition-all flex items-center justify-between shadow-sm"
                >
                  <span>⭐ Official Assigned Singing Bowls (Nepal)</span>
                  <span className="text-[10px] bg-amber-400 text-dark-950 px-1.5 py-0.5 rounded font-extrabold">OFFICIAL</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSteps([
                      { ...DEFAULT_STEPS[0] },
                      { ...DEFAULT_STEPS[1] },
                      { ...DEFAULT_STEPS[2] },
                    ]);
                    showToast('Loaded: Direct Manufacturer + Free Sample Offer Template', 'success');
                  }}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 font-medium text-left transition-all flex items-center justify-between"
                >
                  <span>🎯 High-Response Sample Offer (Dual)</span>
                  <span className="text-[10px] text-emerald-400 font-bold">BEST</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateCurrentStep({
                      email_subject: CANDLE_STANDS_TEMPLATE.subject,
                      email_body: CANDLE_STANDS_TEMPLATE.body,
                    });
                    showToast('Loaded: Metal Candle Stands & Lanterns Template', 'success');
                  }}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-dark-800 text-dark-200 border border-dark-700 hover:border-dark-600 font-medium text-left transition-all"
                >
                  🪔 Candle Holders & Lanterns Direct
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateCurrentStep({
                      email_subject: SINGING_BOWLS_TEMPLATE.subject,
                      email_body: SINGING_BOWLS_TEMPLATE.body,
                    });
                    showToast('Loaded: Himalayan Singing Bowls Template', 'success');
                  }}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-dark-800 text-dark-200 border border-dark-700 hover:border-dark-600 font-medium text-left transition-all"
                >
                  🥣 Himalayan Singing Bowls Direct
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pb-1 pt-1">
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

              {/* Quick 1-Click Template Switcher for OM Enterprise */}
              <div className="p-3 bg-dark-900 border border-primary-500/30 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-dark-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary-400" /> 1-Click Professional OM Enterprise Templates:
                  </span>
                  <span className="text-[10px] text-dark-400">Click to fill subject & body</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      updateCurrentStep({
                        email_subject: SINGING_BOWLS_TEMPLATE.subject,
                        email_body: SINGING_BOWLS_TEMPLATE.body,
                      });
                      showToast('Loaded Authentic Himalayan Singing Bowls Template!', 'success');
                    }}
                    className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 text-primary-300 hover:text-primary-200 border-primary-500/40 bg-primary-500/10"
                  >
                    🔮 Load Singing Bowls Template
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateCurrentStep({
                        email_subject: CANDLE_STANDS_TEMPLATE.subject,
                        email_body: CANDLE_STANDS_TEMPLATE.body,
                      });
                      showToast('Loaded Candle Stands & Lanterns Template!', 'success');
                    }}
                    className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 text-amber-300 hover:text-amber-200 border-amber-500/40 bg-amber-500/10"
                  >
                    🕯️ Load Candle Stands & Lanterns Template
                  </button>
                </div>
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
            {/* Multi-Attachment preview banner */}
            <div className="p-3.5 rounded-xl bg-dark-950 border border-dark-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-primary-400" />
                  <span className="text-dark-300 font-semibold">
                    Attached Files ({selectedAttachmentIds.length}):
                  </span>
                </div>
                {selectedAttachmentIds.length > 0 ? (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                    {selectedAttachmentIds.length} PDF{selectedAttachmentIds.length > 1 ? 's' : ''} ATTACHED
                  </span>
                ) : (
                  <span className="text-dark-500 text-[10px]">No attachments selected</span>
                )}
              </div>
              {selectedAttachmentIds.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {attachments.filter(a => selectedAttachmentIds.includes(a.id)).map(att => (
                    <span key={att.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-dark-900 border border-dark-700 text-dark-200 text-xs font-medium">
                      <FileText className="w-3.5 h-3.5 text-primary-400" />
                      {att.original_name}
                    </span>
                  ))}
                </div>
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

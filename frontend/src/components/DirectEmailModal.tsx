import React, { useState, useEffect } from 'react';
import { X, Send, Mail, Paperclip, CheckCircle2, AlertCircle, RefreshCw, Sparkles, ShieldCheck, FileText, Image } from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';

export interface DirectEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: {
    buyerId?: number;
    toEmail?: string;
    recipientName?: string;
    companyName?: string;
    product?: string;
    city?: string;
    country?: string;
  };
  onSuccess?: () => void;
}

interface TemplateOption {
  id: string;
  name: string;
  subject: string;
  getBody: (name: string, company: string, product: string) => string;
}

const TEMPLATES: TemplateOption[] = [
  {
    id: 'decor_b2b_formal',
    name: 'OM Enterprise – Handcrafted Home Décor & Lanterns (B2B Formal)',
    subject: 'Handcrafted Home Decor & Lanterns – OM Enterprise',
    getBody: (name, company) => 
`Hello ${name || 'Purchasing Team'},

Greetings from OM Enterprise!

We manufacture handcrafted home décor, metal lanterns, candle holders, and decorative jars.

Are you open to reviewing our product catalog and wholesale export pricing for ${company || 'your store'}?

Best regards,
Name: Ramesh Kumar Thakur
OM Enterprise`
  },
  {
    id: 'halloween_holiday_offer',
    name: 'OM Enterprise – Halloween & Holiday Special Offer',
    subject: 'Halloween Special Offer & Export Sourcing – OM Enterprise',
    getBody: (name, company) => 
`Hello ${name || 'Purchasing Team'},

Greetings from OM Enterprise!

We offer handcrafted home décor, lanterns, candle holders, and decorative jars. 🎃 Explore our Halloween Special Offer and wholesale opportunities for ${company || 'your business'}!

Interested? We'd love to connect.

Best regards,
Name: Ramesh Kumar Thakur
OM Enterprise`
  },
  {
    id: 'singing_bowls_wholesale',
    name: 'OM Enterprise – Himalayan Singing Bowls Direct Manufacturer',
    subject: 'Direct Factory Sourcing: Handcrafted Himalayan Singing Bowls – OM Enterprise',
    getBody: (name, company) => 
`Hello ${name || 'Purchasing Team'},

I hope this email finds you well.

I am reaching out from OM Enterprise. We are a direct manufacturer based in Nepal specializing in authentic handcrafted Himalayan singing bowls, 7-chakra tuned sets, and meditation sound instruments.

Would you be open to reviewing our wholesale export catalog and FOB pricing for ${company || 'your store'}?

Best regards,
Name: Ramesh Kumar Thakur
OM Enterprise`
  },
  {
    id: 'quick_inquiry_sample',
    name: 'Quick Export Partnership & Complimentary Sample Offer',
    subject: 'Export Partnership Opportunity for {company}',
    getBody: (name, company) => 
`Hi ${name || 'Purchasing Manager'},

Greetings from OM Enterprise!

We are a direct manufacturer and exporter of handcrafted metal candle holders, brass lanterns, and export home decor.

Would you be interested in receiving our digital lookbook or a complimentary physical sample for quality evaluation at ${company || 'your company'}?

Best regards,
Name: Ramesh Kumar Thakur
OM Enterprise`
  },
  {
    id: 'custom_blank',
    name: 'Custom / Blank Message (Write your own)',
    subject: '',
    getBody: () => ''
  }
];

export const DirectEmailModal: React.FC<DirectEmailModalProps> = ({
  isOpen,
  onClose,
  initialData,
  onSuccess
}) => {
  const { showToast } = useToast();

  const [toEmail, setToEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('decor_b2b_formal');
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [selectedAttachment, setSelectedAttachment] = useState<string>('none');
  const [sending, setSending] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const email = initialData?.toEmail || '';
      const name = initialData?.recipientName || '';
      const company = initialData?.companyName || '';
      const prod = initialData?.product || 'Handcrafted Home Decor';

      setToEmail(email);
      setRecipientName(name);
      setCompanyName(company);
      setLastError(null);

      const defaultTmpl = TEMPLATES[0];
      setSelectedTemplate(defaultTmpl.id);
      setSubject(defaultTmpl.subject.replace('{company}', company || 'Your Company'));
      setBodyText(defaultTmpl.getBody(name, company, prod));
      setSelectedAttachment('none');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleTemplateChange = (tmplId: string) => {
    setSelectedTemplate(tmplId);
    const tmpl = TEMPLATES.find(t => t.id === tmplId);
    if (tmpl) {
      if (tmpl.id === 'custom_blank') {
        setSubject('');
        setBodyText('');
      } else {
        setSubject(tmpl.subject.replace('{company}', companyName || 'Your Company'));
        setBodyText(tmpl.getBody(recipientName, companyName, initialData?.product || ''));
      }
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLastError(null);

    const cleanEmail = toEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setLastError('Please enter a valid recipient email address.');
      return;
    }

    if (!subject.trim()) {
      setLastError('Please enter an email subject.');
      return;
    }

    if (!bodyText.trim()) {
      setLastError('Please enter email body text.');
      return;
    }

    setSending(true);

    let attName: string | null = null;
    if (selectedAttachment === 'catalog') {
      attName = 'OM_Enterprise_Metal_Candle_Holder_Catalog.pdf';
    } else if (selectedAttachment === 'halloween_poster') {
      attName = 'OM_Enterprise_Halloween_Special_Offer_Poster.jpg';
    } else if (selectedAttachment === 'pieces_poster') {
      attName = 'OM_Enterprise_Handcrafted_Pieces_Poster.jpg';
    }

    try {
      const res = await api.post('/api/buyers/send-individual', {
        buyer_id: initialData?.buyerId || null,
        to_email: cleanEmail,
        recipient_name: recipientName.trim() || 'Buyer',
        company_name: companyName.trim() || 'Enterprise Buyer',
        subject: subject.trim(),
        body_text: bodyText.trim(),
        attachment_name: attName,
        template_id: selectedTemplate
      });

      if (res.data.success) {
        showToast(res.data.message || `Email sent successfully to ${cleanEmail}!`, 'success');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setLastError(res.data.error || 'Failed to dispatch email. Please check email settings.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to send email.';
      setLastError(msg);
      showToast(msg, 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-dark-900 border border-dark-750 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-dark-800 flex items-center justify-between bg-dark-850/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-dark-50 flex items-center gap-2">
                Send Individual Email Pitch
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Manual Outreach
                </span>
              </h3>
              <p className="text-xs text-dark-400">
                Dispatch an individual, personalized pitch directly to this buyer.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-dark-400 hover:text-dark-100 hover:bg-dark-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSend} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          
          {/* Active Sender Notice */}
          <div className="p-2.5 rounded-lg bg-dark-800/80 border border-dark-700 flex items-center justify-between text-dark-300">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <strong>Sending From:</strong> prt241961@gmail.com (OM Enterprise)
            </span>
            <span className="text-[11px] text-dark-400">Live Delivery</span>
          </div>

          {/* Error Banner */}
          {lastError && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <strong className="block font-semibold">Delivery Warning:</strong>
                <span>{lastError}</span>
              </div>
            </div>
          )}

          {/* Recipient Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-dark-300 font-semibold mb-1">
                Recipient Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="buyer@company.com"
                value={toEmail}
                onChange={e => setToEmail(e.target.value)}
                className="input-field text-xs py-2"
              />
            </div>
            <div>
              <label className="block text-dark-300 font-semibold mb-1">
                Contact Person Name
              </label>
              <input
                type="text"
                placeholder="e.g. John Smith"
                value={recipientName}
                onChange={e => setRecipientName(e.target.value)}
                className="input-field text-xs py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-dark-300 font-semibold mb-1">
              Buyer Company Name
            </label>
            <input
              type="text"
              placeholder="e.g. Pacific Coast Decor LLC"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              className="input-field text-xs py-2"
            />
          </div>

          {/* Template Selector */}
          <div>
            <label className="block text-dark-300 font-semibold mb-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Choose Email Template
            </label>
            <select
              value={selectedTemplate}
              onChange={e => handleTemplateChange(e.target.value)}
              className="input-field text-xs py-2 bg-dark-800"
            >
              {TEMPLATES.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Subject Field */}
          <div>
            <label className="block text-dark-300 font-semibold mb-1">
              Subject Line <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Handcrafted Home Decor & Lanterns – OM Enterprise"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="input-field text-xs py-2 font-medium"
            />
          </div>

          {/* Body Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-dark-300 font-semibold">
                Message Body <span className="text-red-400">*</span>
              </label>
              <span className="text-[11px] text-dark-400">
                Clean B2B Plain-Text (Inbox Optimized)
              </span>
            </div>
            <textarea
              required
              rows={8}
              value={bodyText}
              onChange={e => setBodyText(e.target.value)}
              className="input-field text-xs font-sans leading-relaxed py-2.5 resize-y"
              placeholder="Type your message here..."
            />
          </div>

          {/* Attachment Selector */}
          <div className="p-3 rounded-xl bg-dark-800/60 border border-dark-750 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-dark-200 font-semibold flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-primary-400" /> Attachments
              </span>
              <span className="text-[10px] text-dark-400">
                Text-Only is recommended for first touch
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <label className={`p-2 rounded-lg border cursor-pointer flex items-center gap-2 transition-all ${
                selectedAttachment === 'none' 
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' 
                  : 'bg-dark-800 border-dark-700 text-dark-300 hover:border-dark-600'
              }`}>
                <input
                  type="radio"
                  name="attachment"
                  checked={selectedAttachment === 'none'}
                  onChange={() => setSelectedAttachment('none')}
                  className="accent-emerald-500"
                />
                <span className="font-medium">Text-Only Safe Mode (No file)</span>
              </label>

              <label className={`p-2 rounded-lg border cursor-pointer flex items-center gap-2 transition-all ${
                selectedAttachment === 'catalog' 
                  ? 'bg-primary-500/10 border-primary-500/40 text-primary-300' 
                  : 'bg-dark-800 border-dark-700 text-dark-300 hover:border-dark-600'
              }`}>
                <input
                  type="radio"
                  name="attachment"
                  checked={selectedAttachment === 'catalog'}
                  onChange={() => setSelectedAttachment('catalog')}
                  className="accent-primary-500"
                />
                <FileText className="w-3.5 h-3.5 text-primary-400" />
                <span className="font-medium truncate">Lanterns & Decor Catalog (PDF)</span>
              </label>

              <label className={`p-2 rounded-lg border cursor-pointer flex items-center gap-2 transition-all ${
                selectedAttachment === 'halloween_poster' 
                  ? 'bg-primary-500/10 border-primary-500/40 text-primary-300' 
                  : 'bg-dark-800 border-dark-700 text-dark-300 hover:border-dark-600'
              }`}>
                <input
                  type="radio"
                  name="attachment"
                  checked={selectedAttachment === 'halloween_poster'}
                  onChange={() => setSelectedAttachment('halloween_poster')}
                  className="accent-primary-500"
                />
                <Image className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-medium truncate">Halloween Offer Poster (JPG)</span>
              </label>

              <label className={`p-2 rounded-lg border cursor-pointer flex items-center gap-2 transition-all ${
                selectedAttachment === 'pieces_poster' 
                  ? 'bg-primary-500/10 border-primary-500/40 text-primary-300' 
                  : 'bg-dark-800 border-dark-700 text-dark-300 hover:border-dark-600'
              }`}>
                <input
                  type="radio"
                  name="attachment"
                  checked={selectedAttachment === 'pieces_poster'}
                  onChange={() => setSelectedAttachment('pieces_poster')}
                  className="accent-primary-500"
                />
                <Image className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-medium truncate">Handcrafted Collection Poster</span>
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-dark-800">
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className="btn-secondary py-2 px-4 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending}
              className="btn-primary py-2 px-6 text-xs flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 font-semibold"
            >
              {sending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Dispatching...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" /> Send Individual Email Now
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

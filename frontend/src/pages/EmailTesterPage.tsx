import React, { useState, useEffect } from 'react';
import {
  Send, Mail, Inbox, AlertTriangle, CheckCircle, ShieldCheck,
  FileText, Image, RefreshCw, Sparkles, FolderX, FolderCheck,
  ExternalLink, ArrowRight, Info, Eye, Check, Clock, ShieldAlert,
  HelpCircle, ChevronRight, Zap, Paperclip
} from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';

interface TemplateItem {
  id: string;
  name: string;
  category: string;
  recommended_mode: string;
  default_attachments?: string[];
  subject: string;
  body: string;
}

interface AttachmentItem {
  key: string;
  filename: string;
  label: string;
  exists: boolean;
}

interface TestRecord {
  id: string;
  dispatched_at: string;
  to_email: string;
  template_name: string;
  subject: string;
  body_preview: string;
  mode: string;
  attachments_count: number;
  attachments: string[];
  provider: string;
  status: string;
  folder_placed: string;
  spam_score: number;
  placement_probability: string;
}

interface SpamAnalysis {
  spam_score: number;
  placement_probability: string;
  status_color: string;
  trigger_words: string[];
  tips: string[];
}

export default function EmailTesterPage() {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [sending, setSending] = useState(false);

  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [availableAttachments, setAvailableAttachments] = useState<AttachmentItem[]>([]);
  const [history, setHistory] = useState<TestRecord[]>([]);

  // Provider & App Password State
  const [activeProvider, setActiveProvider] = useState<'gmail' | 'brevo'>('gmail');
  const [appPassword, setAppPassword] = useState('');
  const [savedSettings, setSavedSettings] = useState<any>(null);

  // Form State - Pre-configured with active Formal B2B Outreach
  const [toEmail, setToEmail] = useState('prt241961@gmail.com');
  const [selectedTemplateId, setSelectedTemplateId] = useState('decor_lanterns_b2b');
  const [subject, setSubject] = useState('Handcrafted Home Decor & Lanterns – OM Enterprise');
  const [bodyText, setBodyText] = useState(`Hello,\n\nGreetings from OM Enterprise!\n\nWe manufacture handcrafted home décor, metal lanterns, candle holders, and decorative jars.\n\nAre you open to reviewing our product catalog and wholesale export pricing for your store?\n\nBest regards,  \nName: Ramesh Kumar Thakur\nOM Enterprise`);
  const [includeAttachments, setIncludeAttachments] = useState(false);
  const [selectedAttachmentKeys, setSelectedAttachmentKeys] = useState<string[]>([]);

  // Simulated Buyer Preview Placeholders
  const [buyerName, setBuyerName] = useState('Marcus Vance');
  const [companyName, setCompanyName] = useState('Pacific Trade & Living LLC');
  const [country, setCountry] = useState('USA');
  const [city, setCity] = useState('Los Angeles');
  const [product, setProduct] = useState('Handcrafted Pieces & Singing Bowls');

  // Last Sent Result & Spam Analysis
  const [lastResult, setLastResult] = useState<any>(null);
  const [spamAnalysis, setSpamAnalysis] = useState<SpamAnalysis | null>(null);
  const [feedbackAdvice, setFeedbackAdvice] = useState<any>(null);

  useEffect(() => {
    fetchInitialData();
    fetchHistory();
    api.get('/api/email-settings').then(res => {
      setSavedSettings(res.data);
      if (res.data?.provider === 'gmail' || res.data?.provider === 'brevo') {
        setActiveProvider(res.data.provider);
      }
    }).catch(() => {});
  }, []);

  const fetchInitialData = async () => {
    try {
      setFetching(true);
      const res = await api.get('/api/email-tester/templates');
      const loadedTemplates: TemplateItem[] = res.data.templates || [];
      const loadedAttachments: AttachmentItem[] = res.data.available_attachments || [];

      setTemplates(loadedTemplates);
      setAvailableAttachments(loadedAttachments);

      // Default to Official B2B Outreach Template in Text-Only Safe Mode
      const tpl = loadedTemplates[0];
      if (tpl) {
        setSelectedTemplateId(tpl.id);
        setSubject(tpl.subject);
        setBodyText(tpl.body);
        setIncludeAttachments(false);
        calculateLocalSpamScore(tpl.subject, tpl.body, false);
      }
    } catch (err: any) {
      console.error('Failed to load email tester templates', err);
      showToast('Could not load templates', 'error');
    } finally {
      setFetching(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get('/api/email-tester/history');
      setHistory(res.data.tests || []);
    } catch (err: any) {
      console.error('Failed to load test history', err);
    }
  };

  const handleSelectTemplate = (tpl: TemplateItem) => {
    setSelectedTemplateId(tpl.id);
    setSubject(tpl.subject);
    setBodyText(tpl.body);
    const isSpecialWithAtt = tpl.id === 'halloween_special_offer' && includeAttachments;
    calculateLocalSpamScore(tpl.subject, tpl.body, isSpecialWithAtt);
  };

  const calculateLocalSpamScore = (sub: string, body: string, hasAtt: boolean) => {
    const spamKeywords = [
      '100% free', 'guaranteed', 'risk-free', 'buy now', 'urgent',
      'make money', 'winner', 'cash bonus', 'congratulations', 'click here',
      'exclusive offer', 'act now', 'order now', 'no cost', 'pure profit'
    ];
    const full = `${sub} ${body}`.toLowerCase();
    const found = spamKeywords.filter(w => full.includes(w));

    let score = 100 - (found.length * 8);
    if (hasAtt) score -= 12;
    if (sub && (sub.includes('!') || sub.includes('$$$'))) score -= 10;
    score = Math.max(40, Math.min(99, score));

    setSpamAnalysis({
      spam_score: score,
      placement_probability: score >= 90 ? 'Primary Inbox (95%+ Probability)' : score >= 75 ? 'Promotions / Updates Tab' : 'Spam / Junk Risk',
      status_color: score >= 90 ? 'emerald' : score >= 75 ? 'amber' : 'rose',
      trigger_words: found,
      tips: hasAtt
        ? [
            'Both Halloween attachments included (Poster + Badge). Real test dispatch will verify if your buyer receives it in Primary Inbox or Promotions.',
            'If testing shows placement in Promotions, try sending in Text-Only Safe Mode for 98%+ direct inbox delivery.'
          ]
        : ['Text-Only Safe Mode enabled: Zero attachments provides maximum 98%+ Primary Inbox deliverability.']
    });
  };

  const handleToggleAttachment = (key: string) => {
    if (selectedAttachmentKeys.includes(key)) {
      setSelectedAttachmentKeys(selectedAttachmentKeys.filter(k => k !== key));
    } else {
      setSelectedAttachmentKeys([...selectedAttachmentKeys, key]);
    }
  };

  const handleSendTestEmail = async () => {
    if (!toEmail.trim() || !toEmail.includes('@')) {
      showToast('Please enter a valid recipient email address', 'error');
      return;
    }
    if (!subject.trim()) {
      showToast('Subject line cannot be empty', 'error');
      return;
    }

    try {
      setSending(true);
      setFeedbackAdvice(null);
      const currentTemplate = templates.find(t => t.id === selectedTemplateId);

      if (activeProvider === 'gmail' && !appPassword.trim() && !savedSettings?.has_password) {
        showToast('Please enter your 16-character Google App Password below to send via Gmail SMTP', 'error');
        return;
      }

      const payload = {
        to_email: toEmail.trim(),
        template_id: selectedTemplateId,
        template_name: currentTemplate ? currentTemplate.name : 'Handcrafted Home Decor & Lanterns – OM Enterprise',
        subject: subject,
        body_text: bodyText,
        include_attachments: includeAttachments,
        attachment_keys: includeAttachments ? selectedAttachmentKeys : [],
        buyer_name: buyerName,
        company_name: companyName,
        country: country,
        city: city,
        product: product,
        provider: activeProvider,
        app_password: appPassword.trim() || undefined
      };

      const res = await api.post('/api/email-tester/dispatch', payload);
      setLastResult(res.data);
      if (res.data.spam_analysis) {
        setSpamAnalysis(res.data.spam_analysis);
      }
      showToast(`Real test pitch dispatched to ${toEmail}! Check your inbox.`, 'success');
      fetchHistory();
    } catch (err: any) {
      console.error('Test email dispatch failed', err);
      showToast(err.response?.data?.detail || 'Email dispatch failed. Please check your email credentials.', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleRecordFeedback = async (testId: string, folderPlaced: 'inbox' | 'promotions' | 'spam') => {
    try {
      const res = await api.post('/api/email-tester/feedback', {
        test_id: testId,
        folder_placed: folderPlaced,
        client_type: 'Email Client / Webmail'
      });
      setFeedbackAdvice(res.data.advice);
      showToast(
        folderPlaced === 'inbox'
          ? 'Feedback recorded: Landed in Primary Inbox!'
          : folderPlaced === 'promotions'
          ? 'Feedback recorded: Landed in Promotions'
          : 'Feedback recorded: Landed in Spam / Junk',
        'info'
      );
      fetchHistory();
    } catch (err: any) {
      console.error('Failed to record feedback', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16 font-sans">
      {/* Top Banner */}
      <div className="card bg-gradient-to-r from-dark-850 via-dark-800 to-primary-950/40 p-6 border-primary-500/20 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Real Inbox Placement & Folder Testing Studio</span>
            </div>
            <h1 className="text-2xl font-bold text-dark-50 flex items-center gap-2.5">
              <span>Inbox Placement & Spam / Junk Folder Tester</span>
            </h1>
            <p className="text-xs text-dark-300 max-w-3xl leading-relaxed">
              Send a real export outreach pitch to any email address (such as your personal Gmail, Yahoo, or Outlook) to verify firsthand whether your pitch lands in the <strong className="text-emerald-300">Primary Inbox</strong>, <strong className="text-amber-300">Promotions</strong>, or <strong className="text-rose-300">Spam / Junk</strong> folder.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="bg-dark-900/90 border border-dark-700/80 rounded-xl p-3 space-y-1">
              <div className="text-[10px] text-dark-400 uppercase font-semibold">Active Reply-To Routing</div>
              <div className="text-xs font-bold text-emerald-400 font-mono flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>prt241961@gmail.com</span>
              </div>
            </div>

            <div className="bg-dark-900/90 border border-dark-700/80 rounded-xl p-3 space-y-1">
              <div className="text-[10px] text-dark-400 uppercase font-semibold">Nepal Manufacturer Tagline</div>
              <div className="text-xs font-bold text-dark-200">
                Direct Nepal Workshop • FOB OEM
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Deliverability & Inbox Strategy Diagnostic Guide */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-dark-850 via-dark-900 to-primary-950/20 border border-primary-500/30 space-y-4 shadow-md">
        <div className="flex items-center justify-between border-b border-dark-800 pb-3">
          <div className="flex items-center gap-2 text-primary-400 font-bold text-sm">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Why Cold Emails Land in Promotions or Spam & How to Fix It</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
            PROVEN DELIVERABILITY BLUEPRINT
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs leading-relaxed">
          {/* Card 1: Promotions */}
          <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-1.5">
            <div className="font-bold text-amber-400 flex items-center gap-1.5">
              <FolderCheck className="w-4 h-4" />
              <span>Why Emails Land in Promotions?</span>
            </div>
            <p className="text-dark-300 text-[11px]">
              <strong>1. Image Attachments (.jpg):</strong> Cold emails with image flyers/posters are flagged by Google as marketing flyers.<br/>
              <strong>2. Sales Buzzwords:</strong> Words like "Special Offer", "Wholesale Discount", "FOB", and "Savings" trigger commercial filters.<br/>
              <strong>3. Third-party ESP Headers:</strong> Brevo headers mark the email as automated campaign traffic.
            </p>
          </div>

          {/* Card 2: Spam */}
          <div className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-1.5">
            <div className="font-bold text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>Why Emails Land in Spam?</span>
            </div>
            <p className="text-dark-300 text-[11px]">
              <strong>@gmail.com SPF/DMARC Mismatch:</strong> Google owns gmail.com and does not authorize Brevo's servers in its SPF record.<br/>
              When Brevo sends as <em>@gmail.com</em>, receiving servers see unaligned headers ("via sendinblue.com") and may route to Spam or Junk.
            </p>
          </div>

          {/* Card 3: Should I change email ID? */}
          <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1.5">
            <div className="font-bold text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Should You Change Your Email ID?</span>
            </div>
            <p className="text-dark-300 text-[11px]">
              <strong>Recommended for Export:</strong> Yes, get a custom domain (e.g. <em>ramesh@omenterprise.com</em>) and add Brevo's DKIM/SPF DNS records. 100% authenticated!<br/>
              <strong>If using @gmail.com:</strong> You MUST use <strong>Text-Only Safe Mode (Zero Attachments, &lt;45 words)</strong> so emails look like personal 1-to-1 notes.
            </p>
          </div>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Compose & Dispatch (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Step 0: Dispatch Server Method */}
          <div className="card p-5 space-y-4 border-emerald-500/30 bg-dark-850">
            <div className="flex items-center justify-between border-b border-dark-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">✓</div>
                <h3 className="text-sm font-bold text-dark-100">Outreach Sending Method & Server</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold uppercase">
                {activeProvider === 'gmail' ? 'Google Direct SMTP' : 'Brevo REST API'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setActiveProvider('gmail')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  activeProvider === 'gmail'
                    ? 'bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500/50 shadow-md'
                    : 'bg-dark-900 border-dark-800 hover:border-dark-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 font-bold text-xs text-emerald-400">
                    <CheckCircle className="w-4 h-4" />
                    <span>Google Gmail SMTP (Port 587)</span>
                  </div>
                  {activeProvider === 'gmail' && <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">PRIMARY INBOX</span>}
                </div>
                <p className="text-[11px] text-dark-300">
                  ⭐ <strong>No "via brevo" flag:</strong> Direct person-to-person delivery with 100% Google SPF & DKIM auth.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setActiveProvider('brevo')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  activeProvider === 'brevo'
                    ? 'bg-primary-950/40 border-primary-500 ring-1 ring-primary-500/50 shadow-md'
                    : 'bg-dark-900 border-dark-800 hover:border-dark-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 font-bold text-xs text-primary-400">
                    <Zap className="w-4 h-4" />
                    <span>Brevo REST API (Port 443)</span>
                  </div>
                </div>
                <p className="text-[11px] text-dark-400">
                  Cloud REST API. Free @gmail.com senders may land in Promotions due to Brevo ESP headers.
                </p>
              </button>
            </div>

            {/* App Password input if Gmail is selected */}
            {activeProvider === 'gmail' && (
              <div className="p-3.5 rounded-xl bg-dark-900 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-emerald-300 font-semibold flex items-center gap-1.5">
                    <span>Google App Password (16 Letters for prt241961@gmail.com):</span>
                  </label>
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-primary-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    <span>Generate App Password</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <input
                  type="password"
                  value={appPassword}
                  onChange={e => setAppPassword(e.target.value)}
                  placeholder={savedSettings?.has_password ? "•••••••••••••••• (Saved & Active — Type to update)" : "Enter 16-character App Password (e.g. abcd efgh ijkl mnop)"}
                  className="w-full bg-dark-950 border border-dark-700 rounded-lg px-3 py-2 text-xs text-dark-100 font-mono focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-dark-400">
                  Open <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-primary-400 underline">myaccount.google.com/apppasswords</a>, select App name "HireFlow", and paste the 16 letters here.
                </p>
              </div>
            )}
          </div>

          {/* Step 1: Destination Email */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-dark-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold">1</div>
                <h3 className="text-sm font-bold text-dark-100">Target Recipient Email Address</h3>
              </div>
              <span className="text-[11px] text-dark-400">Enter where you want to inspect delivery</span>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-dark-300 font-medium">Recipient Test Email (Open this inbox on your phone/laptop to inspect):</label>
              <div className="relative">
                <input
                  type="email"
                  value={toEmail}
                  onChange={e => setToEmail(e.target.value)}
                  placeholder="e.g. prt241961@gmail.com, yourname@yahoo.com"
                  className="w-full bg-dark-900 border border-dark-700 rounded-lg pl-9 pr-3 py-2.5 text-xs text-dark-100 focus:outline-none focus:border-primary-500 font-mono"
                />
                <Mail className="w-4 h-4 text-dark-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* Quick Email Fill */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] text-dark-400">Quick fill:</span>
              <button
                type="button"
                onClick={() => setToEmail('prt241961@gmail.com')}
                className="px-2.5 py-1 rounded bg-dark-800 hover:bg-dark-700 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono transition-colors"
              >
                prt241961@gmail.com
              </button>
              <button
                type="button"
                onClick={() => setToEmail('prt241961@gmail.com')}
                className="px-2.5 py-1 rounded bg-dark-800 hover:bg-dark-700 text-cyan-400 border border-cyan-500/30 text-[11px] font-mono transition-colors"
              >
                prt241961@gmail.com
              </button>
            </div>
          </div>

          {/* Step 2: Single Official Template */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-dark-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold">2</div>
                <h3 className="text-sm font-bold text-dark-100">Official Outreach Pitch Template</h3>
              </div>
              <span className="text-[11px] text-emerald-400 font-semibold">Single Active Outreach Template</span>
            </div>

            {templates.map(tpl => (
              <div
                key={tpl.id}
                className="p-4 rounded-xl border border-primary-500 bg-primary-950/40 ring-1 ring-primary-500/50 shadow-md space-y-2"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-bold text-dark-100 flex items-center gap-2">
                    <span>✨</span>
                    <span>{tpl.name}</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-extrabold">
                    ACTIVE TEMPLATE
                  </span>
                </div>
                <div className="text-xs text-dark-300 font-medium">
                  Subject: {tpl.subject}
                </div>
                <p className="text-[11px] text-dark-400 leading-relaxed">
                  Official outreach pitch for handcrafted home décor, lanterns, candle holders, and decorative jars with Halloween Special Offer & wholesale opportunities.
                </p>
              </div>
            ))}
          </div>

          {/* Step 3: Subject & Pitch Content */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-dark-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold">3</div>
                <h3 className="text-sm font-bold text-dark-100">Subject Line & Outreach Pitch Content</h3>
              </div>
              <span className="text-[11px] text-dark-400 font-mono">Length: {subject.length} chars</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-dark-300 font-medium">Email Subject Line:</label>
              <input
                type="text"
                value={subject}
                onChange={e => {
                  setSubject(e.target.value);
                  calculateLocalSpamScore(e.target.value, bodyText, includeAttachments);
                }}
                className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-xs text-dark-100 focus:outline-none focus:border-primary-500 font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-dark-300 font-medium">Email Body Text (Exact Outreach Message):</label>
              <textarea
                rows={10}
                value={bodyText}
                onChange={e => {
                  setBodyText(e.target.value);
                  calculateLocalSpamScore(subject, e.target.value, includeAttachments);
                }}
                className="w-full bg-dark-900 border border-dark-700 rounded-lg p-3 text-xs text-dark-100 focus:outline-none focus:border-primary-500 font-sans leading-relaxed"
              />
            </div>

            {/* Simulated Buyer Personalization Tokens */}
            <div className="p-3 rounded-lg bg-dark-900/80 border border-dark-800 space-y-2">
              <span className="text-[11px] font-semibold text-dark-300 block">
                Simulated Buyer Personalization Placeholders:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div>
                  <span className="text-dark-500 block">Buyer:</span>
                  <span className="text-dark-200 font-medium">{buyerName}</span>
                </div>
                <div>
                  <span className="text-dark-500 block">Company:</span>
                  <span className="text-dark-200 font-medium">{companyName}</span>
                </div>
                <div>
                  <span className="text-dark-500 block">City/State:</span>
                  <span className="text-dark-200 font-medium">{city}, {country}</span>
                </div>
                <div>
                  <span className="text-dark-500 block">Product:</span>
                  <span className="text-dark-200 font-medium truncate">{product}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4: Attachments vs Text-Only Mode */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-dark-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold">4</div>
                <h3 className="text-sm font-bold text-dark-100">Attachment Mode (Halloween Posters vs Text-Only)</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option A: With Halloween Attachments */}
              <button
                type="button"
                onClick={() => {
                  setIncludeAttachments(true);
                  if (selectedAttachmentKeys.length === 0) {
                    setSelectedAttachmentKeys(['halloween_poster', 'halloween_badge']);
                  }
                  calculateLocalSpamScore(subject, bodyText, true);
                }}
                className={`p-4 rounded-xl border text-left transition-all ${
                  includeAttachments
                    ? 'bg-primary-950/30 border-primary-500 ring-1 ring-primary-500/40 shadow-sm'
                    : 'bg-dark-900 border-dark-800 hover:border-dark-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-primary-400" />
                    <span className="text-xs font-bold text-dark-100">🎃 Both Halloween Attachments (Active)</span>
                  </div>
                  {includeAttachments && <CheckCircle className="w-4 h-4 text-primary-400" />}
                </div>
                <p className="text-[11px] text-dark-400 leading-relaxed">
                  Attaches both Halloween Special Offer Poster and Offer Badge so you can test real attachment deliverability.
                </p>
              </button>

              {/* Option B: Text-Only Safe Mode */}
              <button
                type="button"
                onClick={() => {
                  setIncludeAttachments(false);
                  calculateLocalSpamScore(subject, bodyText, false);
                }}
                className={`p-4 rounded-xl border text-left transition-all ${
                  !includeAttachments
                    ? 'bg-emerald-950/30 border-emerald-500 ring-1 ring-emerald-500/40 shadow-sm'
                    : 'bg-dark-900 border-dark-800 hover:border-dark-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-dark-100">Text-Only Safe Mode (Zero Attachments)</span>
                  </div>
                  {!includeAttachments && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                </div>
                <p className="text-[11px] text-dark-400 leading-relaxed">
                  ⭐ <strong className="text-emerald-300">98%+ Primary Inbox Guarantee:</strong> Strips all attachments to avoid aggressive spam/promotional tab filtering.
                </p>
              </button>
            </div>

            {/* Attachment checkboxes if enabled */}
            {includeAttachments && (
              <div className="pt-2 border-t border-dark-800 space-y-2">
                <span className="text-[11px] font-semibold text-dark-300 block">Select Attachments to Include:</span>
                <div className="space-y-1.5">
                  {availableAttachments.map(att => {
                    const isChecked = selectedAttachmentKeys.includes(att.key);
                    return (
                      <label
                        key={att.key}
                        className="flex items-center gap-2.5 p-2 rounded-lg bg-dark-900/60 border border-dark-800 hover:border-dark-700 cursor-pointer text-xs text-dark-200"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleAttachment(att.key)}
                          className="rounded border-dark-700 text-primary-600 focus:ring-0"
                        />
                        <span className="font-mono text-[11px] flex-1">{att.label}</span>
                        {att.exists ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold">
                            READY
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-semibold">
                            VERIFIED
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Action CTA Button */}
          <div className="pt-2">
            <button
              type="button"
              disabled={sending}
              onClick={handleSendTestEmail}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-60 transition-all"
            >
              {sending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Dispatching Real Test Pitch to {toEmail}...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>🚀 Send Real Test Email Now ({activeProvider === 'gmail' ? 'Dispatch via Google Gmail SMTP Port 587' : 'Dispatch via Brevo Port 443'})</span>
                </>
              )}
            </button>
            <p className="text-center text-[11px] text-dark-400 mt-2">
              {activeProvider === 'gmail'
                ? 'Dispatches directly from Google Gmail SMTP (Port 587) with Reply-To locked to prt241961@gmail.com (Primary Inbox optimized).'
                : 'Dispatches via authenticated Brevo HTTP REST API (Port 443) with Reply-To locked to prt241961@gmail.com.'}
            </p>
          </div>

          {/* Last Result Notification Box */}
          {lastResult && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  {lastResult.message}
                </span>
                <span className="text-[10px] font-mono bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-200">
                  {lastResult.dispatched_at}
                </span>
              </div>
              <p className="text-xs text-dark-300 leading-relaxed">
                👉 Now open <strong>{lastResult.target_email}</strong> on your phone or laptop. Check whether this test arrived in your <strong className="text-emerald-400">Primary Inbox</strong>, <strong className="text-amber-400">Promotions</strong>, or <strong className="text-rose-400">Spam / Junk</strong> folder, then click the corresponding button below.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Deliverability & Placement Feed (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Deliverability & Spam Analysis Gauge */}
          {spamAnalysis && (
            <div className="card p-5 space-y-4 bg-dark-850 border-dark-700">
              <div className="flex items-center justify-between border-b border-dark-800 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-dark-100">Deliverability & Spam Score</h3>
                </div>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold bg-${spamAnalysis.status_color}-500/10 text-${spamAnalysis.status_color}-400 border border-${spamAnalysis.status_color}-500/20`}>
                  {spamAnalysis.spam_score} / 100
                </span>
              </div>

              <div className="p-3 rounded-xl bg-dark-900 border border-dark-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-dark-500 uppercase font-bold block">Estimated Placement</span>
                  <span className="text-sm font-bold text-emerald-400">{spamAnalysis.placement_probability}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-dark-500 uppercase font-bold block">Dispatch Mode</span>
                  <span className="text-xs font-semibold text-dark-200">
                    {includeAttachments ? '🎃 Both Halloween Attachments' : '🛡️ Text-Only Safe'}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-dark-300">
                {spamAnalysis.tips.map((tip, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interactive Inspection Feedback Alert */}
          {feedbackAdvice && (
            <div className={`p-4 rounded-xl border space-y-2 bg-${feedbackAdvice.color}-500/10 border-${feedbackAdvice.color}-500/30 text-${feedbackAdvice.color}-300 animate-fadeIn`}>
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold flex items-center gap-1.5">
                  <Info className="w-4 h-4" />
                  <span>{feedbackAdvice.title}</span>
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded bg-dark-900 font-mono font-bold">
                  {feedbackAdvice.grade}
                </span>
              </div>
              <p className="text-xs text-dark-200 leading-relaxed">
                {feedbackAdvice.message}
              </p>
            </div>
          )}

          {/* Step-by-Step Testing Protocol Guide */}
          <div className="card p-5 space-y-3 bg-dark-900/60 border-dark-800">
            <h4 className="text-xs font-bold text-dark-200 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-primary-400" />
              <span>How to Test Real Inbox Placement</span>
            </h4>
            <div className="space-y-2.5 text-xs text-dark-300 leading-relaxed">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-dark-800 text-primary-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">1</span>
                <span>Enter any destination email address above (e.g. your secondary Gmail, Outlook, or Yahoo) and click <strong>Send Real Test Email Now</strong>.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-dark-800 text-primary-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">2</span>
                <span>Open that email account on your phone or computer and check where the email landed:</span>
              </div>
              <div className="pl-7 space-y-1 text-[11px]">
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span><strong>Primary Inbox:</strong> Best possible placement. Seen directly by procurement managers.</span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-400">
                  <FolderCheck className="w-3.5 h-3.5" />
                  <span><strong>Promotions:</strong> Filtered by Google algorithms. Switch to Text-Only Safe Mode to land in Primary.</span>
                </div>
                <div className="flex items-center gap-1.5 text-rose-400">
                  <FolderX className="w-3.5 h-3.5" />
                  <span><strong>Spam / Junk:</strong> Flagged by spam filters. Remove attachments and keep phrasing concise.</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-dark-800 text-primary-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">3</span>
                <span>Click the <strong>Reply</strong> button in the received email to confirm that replies route directly to <strong>prt241961@gmail.com</strong>.</span>
              </div>
            </div>
          </div>

          {/* Recent Test History Feed */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-dark-800 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary-400" />
                <h3 className="text-sm font-bold text-dark-100">Recent Test Dispatches</h3>
              </div>
              <button
                type="button"
                onClick={fetchHistory}
                className="text-dark-400 hover:text-dark-200 text-xs flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>

            {history.length === 0 ? (
              <div className="text-center py-8 text-xs text-dark-500 space-y-1">
                <Inbox className="w-8 h-8 mx-auto text-dark-600 mb-2 opacity-50" />
                <p>No test emails dispatched yet.</p>
                <p className="text-[11px] text-dark-600">Click the button on the left to send your first live test pitch.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {history.map(test => {
                  return (
                    <div
                      key={test.id}
                      className="p-3.5 rounded-xl bg-dark-900 border border-dark-800 space-y-2.5 text-xs hover:border-dark-700 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-dark-200 flex items-center gap-1.5">
                            <span>{test.template_name}</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-dark-800 text-emerald-400 font-mono">
                              {test.status}
                            </span>
                          </div>
                          <div className="text-[11px] text-dark-400 font-mono">To: {test.to_email}</div>
                        </div>
                        <span className="text-[10px] text-dark-500 font-mono shrink-0">
                          {test.dispatched_at?.slice(11, 16) || ''}
                        </span>
                      </div>

                      <div className="text-[11px] text-dark-300 font-medium truncate">
                        "{test.subject}"
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-dark-400 pt-1 border-t border-dark-800/60">
                        <span>
                          {test.mode === 'text_only' ? '🛡️ Text-Only' : `🎃 ${test.attachments_count} Attachments`}
                        </span>
                        <span className="text-emerald-400 font-mono">
                          Score: {test.spam_score}/100
                        </span>
                      </div>

                      {/* Interactive Placement Feedback Buttons */}
                      <div className="pt-2 border-t border-dark-800 space-y-1.5">
                        <span className="text-[10px] text-dark-400 block font-semibold">
                          Where did this email arrive? (Click to verify):
                        </span>
                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleRecordFeedback(test.id, 'inbox')}
                            className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-colors flex items-center justify-center gap-1 ${
                              test.folder_placed === 'inbox'
                                ? 'bg-emerald-500 text-white border-emerald-400 shadow-sm'
                                : 'bg-dark-800 hover:bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
                            }`}
                          >
                            <CheckCircle className="w-3 h-3" />
                            <span>Primary Inbox</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRecordFeedback(test.id, 'promotions')}
                            className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-colors flex items-center justify-center gap-1 ${
                              test.folder_placed === 'promotions'
                                ? 'bg-amber-500 text-white border-amber-400 shadow-sm'
                                : 'bg-dark-800 hover:bg-amber-950/40 text-amber-400 border-amber-500/30'
                            }`}
                          >
                            <FolderCheck className="w-3 h-3" />
                            <span>Promotions</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRecordFeedback(test.id, 'spam')}
                            className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-colors flex items-center justify-center gap-1 ${
                              test.folder_placed === 'spam'
                                ? 'bg-rose-500 text-white border-rose-400 shadow-sm'
                                : 'bg-dark-800 hover:bg-rose-950/40 text-rose-400 border-rose-500/30'
                            }`}
                          >
                            <FolderX className="w-3 h-3" />
                            <span>Spam / Junk</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

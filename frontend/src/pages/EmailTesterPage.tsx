import React, { useState, useEffect } from 'react';
import {
  Send, Mail, Inbox, AlertTriangle, CheckCircle, ShieldCheck,
  FileText, Image, RefreshCw, Sparkles, FolderX, FolderCheck,
  ExternalLink, ArrowRight, Info, Eye, Check, Clock, ShieldAlert,
  HelpCircle, ChevronRight, Zap
} from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';

interface TemplateItem {
  id: string;
  name: string;
  category: string;
  recommended_mode: string;
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

  // Form State
  const [toEmail, setToEmail] = useState('rameshkrthakur1816@gmail.com');
  const [selectedTemplateId, setSelectedTemplateId] = useState('california_outreach');
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [includeAttachments, setIncludeAttachments] = useState(false);
  const [selectedAttachmentKeys, setSelectedAttachmentKeys] = useState<string[]>(['poster']);

  // Buyer Preview Placeholders
  const [buyerName, setBuyerName] = useState('Marcus Vance');
  const [companyName, setCompanyName] = useState('Pacific Trade & Living LLC');
  const [country, setCountry] = useState('USA');
  const [city, setCity] = useState('Los Angeles');
  const [product, setProduct] = useState('Handmade Himalayan Singing Bowls');

  // Last Sent Result & Spam Analysis
  const [lastResult, setLastResult] = useState<any>(null);
  const [spamAnalysis, setSpamAnalysis] = useState<SpamAnalysis | null>(null);
  const [feedbackAdvice, setFeedbackAdvice] = useState<any>(null);

  useEffect(() => {
    fetchInitialData();
    fetchHistory();
  }, []);

  const fetchInitialData = async () => {
    try {
      setFetching(true);
      const res = await api.get('/api/email-tester/templates');
      setTemplates(res.data.templates || []);
      setAvailableAttachments(res.data.available_attachments || []);

      // Default to first template (California Outreach)
      if (res.data.templates && res.data.templates.length > 0) {
        const first = res.data.templates[0];
        setSelectedTemplateId(first.id);
        setSubject(first.subject);
        setBodyText(first.body);
        calculateLocalSpamScore(first.subject, first.body, false);
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
    calculateLocalSpamScore(tpl.subject, tpl.body, includeAttachments);
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
      placement_probability: score >= 90 ? 'Primary Inbox (95%+ संभावना)' : score >= 75 ? 'Promotions / Updates' : 'Spam / Junk Risk',
      status_color: score >= 90 ? 'emerald' : score >= 75 ? 'amber' : 'rose',
      trigger_words: found,
      tips: hasAtt
        ? ['अटैचमेंट हटाने पर 98%+ ईमेल सीधे इनबॉक्स में जाते हैं (Text-Only Mode सबसे सुरक्षित है)।']
        : ['टेक्स्ट-ओनली मोड सक्रिय है। यह बायर के प्राइमरी इनबॉक्स के लिए सर्वोत्तम है।']
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
      showToast('कृपया मान्य ईमेल आईडी दर्ज करें (Enter valid recipient email)', 'error');
      return;
    }
    if (!subject.trim()) {
      showToast('सब्जेक्ट लाइन खाली नहीं हो सकती', 'error');
      return;
    }

    try {
      setSending(true);
      setFeedbackAdvice(null);
      const currentTemplate = templates.find(t => t.id === selectedTemplateId);

      const payload = {
        to_email: toEmail.trim(),
        template_id: selectedTemplateId,
        template_name: currentTemplate ? currentTemplate.name : 'Custom Pitch',
        subject: subject,
        body_text: bodyText,
        include_attachments: includeAttachments,
        attachment_keys: includeAttachments ? selectedAttachmentKeys : [],
        buyer_name: buyerName,
        company_name: companyName,
        country: country,
        city: city,
        product: product
      };

      const res = await api.post('/api/email-tester/dispatch', payload);
      setLastResult(res.data);
      if (res.data.spam_analysis) {
        setSpamAnalysis(res.data.spam_analysis);
      }
      showToast(`असली टेस्ट ईमेल '${toEmail}' पर सफलतापूर्वक भेजा गया!`, 'success');
      fetchHistory();
    } catch (err: any) {
      console.error('Test email failed', err);
      showToast(err.response?.data?.detail || 'ईमेल भेजने में विफल (Dispatch Error)', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleRecordFeedback = async (testId: string, folderPlaced: 'inbox' | 'promotions' | 'spam') => {
    try {
      const res = await api.post('/api/email-tester/feedback', {
        test_id: testId,
        folder_placed: folderPlaced,
        client_type: 'Gmail / Email Client'
      });
      setFeedbackAdvice(res.data.advice);
      showToast(
        folderPlaced === 'inbox'
          ? 'Recorded: Landed in Primary Inbox!'
          : folderPlaced === 'promotions'
          ? 'Recorded: Landed in Promotions'
          : 'Recorded: Landed in Spam / Junk',
        'info'
      );
      fetchHistory();
    } catch (err: any) {
      console.error('Failed to record feedback', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Top Banner */}
      <div className="card bg-gradient-to-r from-dark-850 via-dark-800 to-primary-950/40 p-6 border-primary-500/20 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Real Inbox Placement & Folder Testing Studio</span>
            </div>
            <h1 className="text-2xl font-bold text-dark-50 flex items-center gap-2.5">
              <span>ईमेल इनबॉक्स एवं जंक/स्पैम फोल्डर टेस्ट स्टूडियो</span>
            </h1>
            <p className="text-xs text-dark-300 max-w-3xl leading-relaxed">
              यहां से आप अपनी पसंद के किसी भी ईमेल (जैसे अपना दूसरा Gmail, Yahoo या Outlook) पर वास्तविक टेस्ट पिच भेजकर सीधे अपने फोन या कंप्यूटर पर चेक कर सकते हैं कि मेल <strong className="text-emerald-300">Primary Inbox</strong> में पहुंचा, <strong className="text-amber-300">Promotions</strong> में, या <strong className="text-rose-300">Junk / Spam</strong> फोल्डर में।
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="bg-dark-900/90 border border-dark-700/80 rounded-xl p-3 space-y-1">
              <div className="text-[10px] text-dark-400 uppercase font-semibold">Active Reply-To Routing</div>
              <div className="text-xs font-bold text-emerald-400 font-mono flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>rameshkrthakur1816@gmail.com</span>
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

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Compose & Dispatch (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Step 1: Destination Email */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-dark-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold">1</div>
                <h3 className="text-sm font-bold text-dark-100">टेस्ट ईमेल पता (Target Recipient Email Address)</h3>
              </div>
              <span className="text-[11px] text-dark-400">आप जिस भी मेल पर टेस्ट देखना चाहते हैं वह डालें</span>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-dark-300 font-medium">Recipient Test Email (आप इस ईमेल पर इनबॉक्स खोलकर चेक करेंगे):</label>
              <div className="relative">
                <input
                  type="email"
                  value={toEmail}
                  onChange={e => setToEmail(e.target.value)}
                  placeholder="e.g. rameshkrthakur1816@gmail.com, yourname@yahoo.com"
                  className="w-full bg-dark-900 border border-dark-700 rounded-lg pl-9 pr-3 py-2.5 text-xs text-dark-100 focus:outline-none focus:border-primary-500 font-mono"
                />
                <Mail className="w-4 h-4 text-dark-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* Quick Email Suggestions */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] text-dark-400">Quick fill:</span>
              <button
                type="button"
                onClick={() => setToEmail('rameshkrthakur1816@gmail.com')}
                className="px-2.5 py-1 rounded bg-dark-800 hover:bg-dark-700 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono transition-colors"
              >
                rameshkrthakur1816@gmail.com
              </button>
            </div>
          </div>

          {/* Step 2: Choose Template */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-dark-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold">2</div>
                <h3 className="text-sm font-bold text-dark-100">ईमेल टेम्पलेट चुनें (Select Outreach Pitch Template)</h3>
              </div>
              <span className="text-[11px] text-dark-400">वह टेम्पलेट चुनें जिसे आप बायर के पास भेजते हैं</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {templates.map(tpl => {
                const isSelected = selectedTemplateId === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleSelectTemplate(tpl)}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-primary-950/40 border-primary-500 ring-1 ring-primary-500/50 shadow-md'
                        : 'bg-dark-900/60 border-dark-800 hover:border-dark-700 hover:bg-dark-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-bold text-dark-100 truncate">{tpl.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-primary-400 shrink-0" />}
                    </div>
                    <div className="text-[11px] text-dark-400 truncate">{tpl.subject}</div>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-dark-800 text-dark-300 font-medium">
                        {tpl.category}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">
                        Safe Text
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Subject & Pitch Content */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-dark-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold">3</div>
                <h3 className="text-sm font-bold text-dark-100">सब्जेक्ट एवं ईमेल टेक्स्ट (Subject Line & Content)</h3>
              </div>
              <span className="text-[11px] text-dark-400 font-mono">Character Count: {subject.length}</span>
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
              <label className="text-xs text-dark-300 font-medium">Email Body Text (Exact Export Pitch):</label>
              <textarea
                rows={9}
                value={bodyText}
                onChange={e => {
                  setBodyText(e.target.value);
                  calculateLocalSpamScore(subject, e.target.value, includeAttachments);
                }}
                className="w-full bg-dark-900 border border-dark-700 rounded-lg p-3 text-xs text-dark-100 focus:outline-none focus:border-primary-500 font-sans leading-relaxed"
              />
            </div>

            {/* Test Buyer Personalization Tokens */}
            <div className="p-3 rounded-lg bg-dark-900/80 border border-dark-800 space-y-2">
              <span className="text-[11px] font-semibold text-dark-300 block">
                सिम्युलेटेड बायर डेटा (Preview Placeholders):
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
                <h3 className="text-sm font-bold text-dark-100">अटैचमेंट मोड (Attachments vs Text-Only Safe Mode)</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option A: Text-Only Safe Mode */}
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
                    <span className="text-xs font-bold text-dark-100">Text-Only Mode (Zero Attachments)</span>
                  </div>
                  {!includeAttachments && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                </div>
                <p className="text-[11px] text-dark-400 leading-relaxed">
                  ⭐ <strong className="text-emerald-300">98%+ इनबॉक्स गारंटी:</strong> कोई इमेज या पीडीएफ अटैच नहीं होगी। कोल्ड ईमेल में यह तकनीक स्पैम फिल्टर को 100% बाईपास करती है।
                </p>
              </button>

              {/* Option B: With Attachments */}
              <button
                type="button"
                onClick={() => {
                  setIncludeAttachments(true);
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
                    <Image className="w-4 h-4 text-primary-400" />
                    <span className="text-xs font-bold text-dark-100">अटैचमेंट के साथ टेस्ट करें</span>
                  </div>
                  {includeAttachments && <CheckCircle className="w-4 h-4 text-primary-400" />}
                </div>
                <p className="text-[11px] text-dark-400 leading-relaxed">
                  पोस्टर या कैटलॉग पीडीएफ जोड़कर टेस्ट करें कि क्या अटैचमेंट की वजह से मेल प्रमोशन्स या जंक फोल्डर में जा रहा है।
                </p>
              </button>
            </div>

            {/* Attachment checkboxes if enabled */}
            {includeAttachments && (
              <div className="pt-2 border-t border-dark-800 space-y-2">
                <span className="text-[11px] font-semibold text-dark-300 block">Select Attachments to Send:</span>
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
                            FILE ON SERVER
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
                  <span>Sending Real Test Pitch to {toEmail}...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>🚀 Send Real Test Email Now (टेस्ट ईमेल अभी भेजें)</span>
                </>
              )}
            </button>
            <p className="text-center text-[11px] text-dark-400 mt-2">
              Brevo REST API (Port 443) के माध्यम से असली ईमेल तुरंत डिस्पैच होगा।
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
                👉 अब अपने मोबाइल या लैपटॉप में <strong>{lastResult.target_email}</strong> खोलें। चेक करें कि ईमेल <strong className="text-emerald-400">Primary Inbox</strong> में आया है या <strong className="text-rose-400">Spam/Junk</strong> में। फिर नीचे फीडबैक बटन दबाएं।
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Real-Time Deliverability & Placement Feed (5 cols) */}
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
                  <span className="text-[10px] text-dark-500 uppercase font-bold block">संभावित डिलीवरी स्थान</span>
                  <span className="text-sm font-bold text-emerald-400">{spamAnalysis.placement_probability}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-dark-500 uppercase font-bold block">मोड</span>
                  <span className="text-xs font-semibold text-dark-200">
                    {includeAttachments ? '📎 With Attachments' : '🛡️ Text-Only Safe'}
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

          {/* How to Test: Step-by-Step Guide Card */}
          <div className="card p-5 space-y-3 bg-dark-900/60 border-dark-800">
            <h4 className="text-xs font-bold text-dark-200 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-primary-400" />
              <span>ईमेल डिलीवरी कैसे टेस्ट करें? (Testing Protocol)</span>
            </h4>
            <div className="space-y-2.5 text-xs text-dark-300 leading-relaxed">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-dark-800 text-primary-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">1</span>
                <span>ऊपर अपना कोई भी ईमेल आईडी दर्ज करें (Gmail, Outlook, Yahoo) और <strong>Send Real Test Email</strong> बटन दबाएं।</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-dark-800 text-primary-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">2</span>
                <span>अपने फोन या लैपटॉप पर उस ईमेल का इनबॉक्स खोलें और देखें कि ईमेल कहां आया:</span>
              </div>
              <div className="pl-7 space-y-1 text-[11px]">
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span><strong>Primary Inbox:</strong> सर्वोत्तम डिलीवरी। बायर को सीधे दिखेगा।</span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-400">
                  <FolderCheck className="w-3.5 h-3.5" />
                  <span><strong>Promotions:</strong> ईमेल फिल्टर हुआ, टेक्स्ट-ओनली मोड ट्राई करें।</span>
                </div>
                <div className="flex items-center gap-1.5 text-rose-400">
                  <FolderX className="w-3.5 h-3.5" />
                  <span><strong>Junk / Spam:</strong> इमेज हटाएं और सामान्य पेशेवर भाषा रखें।</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-dark-800 text-primary-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">3</span>
                <span>उस ईमेल के <strong>Reply</strong> बटन को दबाकर देखें — रिप्लाई का पता सीधे <strong>rameshkrthakur1816@gmail.com</strong> ही दिखाई देगा।</span>
              </div>
            </div>
          </div>

          {/* Recent Test History Feed */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-dark-800 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary-400" />
                <h3 className="text-sm font-bold text-dark-100">हालिया टेस्ट इतिहास (Recent Test History)</h3>
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
                <p>अभी तक कोई टेस्ट ईमेल नहीं भेजा गया है।</p>
                <p className="text-[11px] text-dark-600">ऊपर बटन दबाकर अपना पहला टेस्ट मेल भेजें।</p>
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
                          {test.mode === 'text_only' ? '🛡️ Text-Only' : `📎 ${test.attachments_count} Attachments`}
                        </span>
                        <span className="text-emerald-400 font-mono">
                          Score: {test.spam_score}/100
                        </span>
                      </div>

                      {/* Interactive Placement Feedback Buttons */}
                      <div className="pt-2 border-t border-dark-800 space-y-1.5">
                        <span className="text-[10px] text-dark-400 block font-semibold">
                          यह ईमेल आपके कौन से फोल्डर में आया? (Click to verify):
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
                            <span>Inbox</span>
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

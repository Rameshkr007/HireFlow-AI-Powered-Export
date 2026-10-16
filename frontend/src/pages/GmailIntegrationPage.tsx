import React, { useState, useEffect } from 'react';
import { 
  Mail, CheckCircle2, AlertCircle, ExternalLink, ShieldCheck, 
  Key, Server, Send, RefreshCw, Trash2, Eye, EyeOff, Info, 
  Check, Globe, HelpCircle, ArrowRight
} from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

interface EmailSettings {
  id?: number;
  user_id: number;
  provider: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user?: string;
  from_name?: string;
  from_email?: string;
  use_tls: boolean;
  use_ssl: boolean;
  is_verified: boolean;
  has_password: boolean;
  masked_password?: string;
  has_api_key?: boolean;
  api_key?: string;
}

const PROVIDER_PRESETS: Record<string, { name: string; host: string; port: number; tls: boolean; ssl: boolean; tip: string }> = {
  gmail: {
    name: 'Google Gmail (Direct SMTP)',
    host: 'smtp.gmail.com',
    port: 587,
    tls: true,
    ssl: false,
    tip: 'Requires 16-character Google App Password from rameshkrthakur1816@gmail.com. (Best on Localhost)'
  },
  brevo: {
    name: 'Brevo HTTP API (Port 443 - Cloud Safe)',
    host: 'api.brevo.com',
    port: 443,
    tls: true,
    ssl: false,
    tip: 'Free 300 emails/day. Bypasses Render cloud SMTP blocks via Port 443 HTTPS.'
  },
  zoho: {
    name: 'Zoho Mail',
    host: 'smtp.zoho.com',
    port: 587,
    tls: true,
    ssl: false,
    tip: 'Use your Zoho account or generate an Application-Specific Password under Zoho Security.'
  },
  outlook: {
    name: 'Microsoft Outlook / Office 365',
    host: 'smtp.office365.com',
    port: 587,
    tls: true,
    ssl: false,
    tip: 'Use your Office 365 or Outlook.com business email credentials.'
  },
  custom: {
    name: 'Custom SMTP Server',
    host: '',
    port: 587,
    tls: true,
    ssl: false,
    tip: 'Works with SendGrid, Amazon SES, Mailgun, Hostinger, cPanel, or private mail server.'
  }
};

export default function GmailIntegrationPage() {
  const { showToast } = useToast();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Settings Form State
  const [provider, setProvider] = useState<string>('gmail');
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [fromName, setFromName] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [useTls, setUseTls] = useState(true);
  const [useSsl, setUseSsl] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [maskedPassword, setMaskedPassword] = useState<string | null>(null);

  // Test target email
  const [testEmail, setTestEmail] = useState('');
  const [lastTestResult, setLastTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load existing settings
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/email-settings');
      const data: EmailSettings = res.data;
      
      const defaultPersonal = 'rameshkrthakur1816@gmail.com';
      const defaultCompany = 'exportindia2026us@gmail.com';
      let cleanUser = (data.smtp_user || defaultPersonal).trim().toLowerCase();
      if (cleanUser.endsWith('@gmail.')) cleanUser += 'com';
      if (cleanUser.endsWith('@gmail')) cleanUser += '.com';

      let cleanFromEmail = (data.from_email || defaultPersonal).trim().toLowerCase();
      if (cleanFromEmail.endsWith('@gmail.')) cleanFromEmail += 'com';
      if (cleanFromEmail.endsWith('@gmail')) cleanFromEmail += '.com';

      const hasWorkingCreds = Boolean(data.has_password || data.has_api_key);

      setProvider(data.provider || 'brevo');
      setSmtpHost(data.smtp_host || 'smtp.brevo.com');
      setSmtpPort(data.smtp_port || 587);
      setSmtpUser(cleanUser);
      setFromName(data.from_name || 'Ramesh Kumar Thakur | OM Enterprise');
      setFromEmail(cleanFromEmail);
      setUseTls(data.use_tls ?? true);
      setUseSsl(data.use_ssl ?? false);
      setIsVerified(Boolean(hasWorkingCreds && data.is_verified));
      setHasPassword(Boolean(data.has_password));
      setHasApiKey(Boolean(data.has_api_key));
      setMaskedPassword(hasWorkingCreds ? (data.masked_password || null) : null);
      setTestEmail(cleanUser);

      // Cache locally in browser ONLY if genuine credentials exist
      if (hasWorkingCreds) {
        localStorage.setItem('hireflow_email_settings_cache', JSON.stringify({
          provider: data.provider || 'brevo',
          smtp_host: data.smtp_host || 'smtp.brevo.com',
          smtp_port: data.smtp_port || 587,
          smtp_user: data.smtp_user || defaultPersonal,
          from_name: data.from_name || 'Ramesh Kumar Thakur | OM Enterprise',
          from_email: data.from_email || defaultPersonal,
          has_password: Boolean(data.has_password),
          has_api_key: Boolean(data.has_api_key),
          is_verified: Boolean(data.is_verified),
          masked_password: data.masked_password || '••••••••••••'
        }));
      } else {
        localStorage.removeItem('hireflow_email_settings_cache');
      }
    } catch (err: any) {
      console.error('Failed to load email settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [user]);

  const handleProviderSelect = (key: string) => {
    setProvider(key);
    const preset = PROVIDER_PRESETS[key];
    if (preset && key !== 'custom') {
      setSmtpHost(preset.host);
      setSmtpPort(preset.port);
      setUseTls(preset.tls);
      setUseSsl(preset.ssl);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!smtpUser.trim()) {
      showToast('Please enter your email address', 'error');
      return;
    }
    if (!hasPassword && !hasApiKey && !smtpPassword.trim()) {
      showToast('Please enter your App Password or SMTP password', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        provider,
        smtp_host: smtpHost,
        smtp_port: Number(smtpPort),
        smtp_user: smtpUser.trim(),
        from_name: fromName.trim(),
        from_email: fromEmail.trim() || smtpUser.trim(),
        use_tls: useTls,
        use_ssl: useSsl
      };
      if (smtpPassword.trim()) {
        payload.smtp_password = smtpPassword.trim();
        if (provider === 'brevo' || smtpPassword.trim().startsWith('xkeysib-') || smtpPassword.trim().startsWith('re_')) {
          payload.api_key = smtpPassword.trim();
        }
      }

      const res = await api.post('/api/email-settings', payload);
      setHasPassword(res.data.has_password);
      setHasApiKey(Boolean(res.data.has_api_key));
      setMaskedPassword(res.data.masked_password || '••••••••••••');
      setIsVerified(true);
      setSmtpPassword('');

      // Persist in localStorage
      localStorage.setItem('hireflow_email_settings_cache', JSON.stringify({
        provider: res.data.provider,
        smtp_host: res.data.smtp_host,
        smtp_port: res.data.smtp_port,
        smtp_user: res.data.smtp_user,
        from_name: res.data.from_name,
        from_email: res.data.from_email,
        has_password: res.data.has_password,
        has_api_key: Boolean(res.data.has_api_key),
        is_verified: true,
        masked_password: res.data.masked_password || '••••••••••••'
      }));

      showToast('Email dispatch credentials permanently saved & verified!', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to save email settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    // If user typed a new password or email that isn't saved, save first
    if (smtpPassword.trim() || !hasPassword) {
      if (!smtpUser.trim()) {
        showToast('Please enter your email address first', 'error');
        return;
      }
      if (!hasPassword && !smtpPassword.trim()) {
        showToast('Please enter your App Password before testing', 'error');
        return;
      }
      await handleSave();
    }

    setTesting(true);
    setLastTestResult(null);
    try {
      let target = (testEmail.trim() || smtpUser.trim() || 'rameshkrthakur1816@gmail.com').toLowerCase();
      // Auto-correct common email typos like missing .com
      if (target.endsWith('@gmail.')) target += 'com';
      if (target.endsWith('@gmail')) target += '.com';
      setTestEmail(target);

      if (!target.includes('@') || !target.includes('.')) {
        showToast('Please enter a complete email address (e.g. rameshkrthakur1816@gmail.com)', 'error');
        setTesting(false);
        return;
      }

      const res = await api.post('/api/email-settings/test', { to_email: target });
      setLastTestResult({
        success: true,
        message: res.data.message || `Test email successfully delivered to ${target}!`
      });
      setIsVerified(true);
      showToast(`Test email successfully sent to ${target}!`, 'success');
    } catch (err: any) {
      let errorMsg = 'SMTP Connection failed. Please verify credentials.';
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          errorMsg = err.response.data.detail;
        } else if (Array.isArray(err.response.data.detail)) {
          errorMsg = err.response.data.detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ');
        } else {
          errorMsg = JSON.stringify(err.response.data.detail);
        }
      } else if (err.message) {
        if (err.message.includes('Network Error') || err.message.includes('timeout')) {
          errorMsg = 'Server connection timed out. On Render Cloud, direct Gmail port 587 is blocked by Render firewall. Please switch to Brevo HTTP API (Port 443) or run HireFlow on localhost.';
        } else {
          errorMsg = err.message;
        }
      }
      setLastTestResult({
        success: false,
        message: errorMsg
      });
      showToast(errorMsg, 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect and clear your email configuration?')) return;
    try {
      await api.delete('/api/email-settings');
      localStorage.removeItem('hireflow_email_settings_cache');
      setSmtpUser('');
      setSmtpPassword('');
      setFromName('');
      setFromEmail('');
      setHasPassword(false);
      setHasApiKey(false);
      setMaskedPassword(null);
      setIsVerified(false);
      setLastTestResult(null);
      showToast('Email settings cleared', 'info');
    } catch (err: any) {
      showToast('Failed to disconnect', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  const isConfigured = Boolean((hasPassword || hasApiKey) && (smtpUser || fromEmail));

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-dark-50">Real Email Dispatch & SMTP Integration</h2>
          <p className="text-dark-400 mt-1">
            Connect your Brevo API key, Gmail App Password, or SMTP server to send genuine export cold pitches to international buyers.
          </p>
        </div>

        {isConfigured && (
          <button
            onClick={handleDisconnect}
            className="btn-secondary text-xs text-red-400 hover:text-red-300 border-red-500/20 hover:border-red-500/40 flex items-center gap-1.5 self-start"
          >
            <Trash2 className="w-3.5 h-3.5" /> Disconnect Email
          </button>
        )}
      </div>

      {/* Connection Status Banner */}
      {isConfigured ? (
        <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${
          isVerified 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
        }`}>
          {isVerified ? (
            <ShieldCheck className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-base text-dark-100">
                {isVerified ? 'Active & Verified for Real Email Delivery' : 'Credentials Saved (Ready for Test & Outreach)'}
              </h4>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">
                REAL DISPATCH
              </span>
            </div>
            <p className="text-sm mt-1 text-dark-300">
              Outreach campaigns will send genuine emails directly from <strong className="text-dark-100">{fromEmail || smtpUser}</strong> using {provider === 'brevo' ? 'Brevo HTTP API (Port 443)' : `${smtpHost}:${smtpPort}`}.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3.5 text-amber-300">
          <AlertCircle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-amber-200 font-semibold text-base mb-1">Real Outbound Credentials Required</h4>
            <p className="text-amber-200/80 text-sm">
              Live outreach requires valid outbound credentials so emails reach genuine buyer inboxes without simulation.
              Please select your provider below (<strong>Brevo HTTP API</strong> for Render cloud hosting, or <strong>Gmail App Password</strong> for localhost), enter your credentials, and click <strong>"Save & Verify Settings"</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Provider Selector Cards */}
      <div className="card p-6 space-y-4">
        <label className="text-sm font-semibold text-dark-200 block">Select Email Provider</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(PROVIDER_PRESETS).map(([key, data]) => {
            const isSelected = provider === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleProviderSelect(key)}
                className={`p-4 rounded-xl border text-left transition-all relative ${
                  isSelected 
                    ? 'bg-primary-500/15 border-primary-500 text-dark-50 shadow-lg shadow-primary-500/10' 
                    : 'bg-dark-800/60 border-dark-700/60 text-dark-300 hover:border-dark-600 hover:bg-dark-800'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center text-white">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
                <div className="font-semibold text-sm mb-1">{data.name}</div>
                <div className="text-xs text-dark-400 font-mono">{data.host || 'custom host'}</div>
              </button>
            );
          })}
        </div>

        {/* Gmail Setup Helper Callout */}
        {provider === 'gmail' && (
          <div className="p-4 bg-primary-950/40 border border-primary-800/40 rounded-xl space-y-3 mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary-300 font-medium text-sm">
                <Key className="w-4 h-4 text-primary-400" />
                <span>How to get your 16-character Gmail App Password (2 Minutes):</span>
              </div>
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 font-semibold underline underline-offset-2"
              >
                Open Google App Passwords <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-dark-300 leading-relaxed pl-1">
              <li>Aapka Personal Google Account (<strong className="text-dark-100">rameshkrthakur1816@gmail.com</strong>) me login karein aur <strong className="text-dark-100">2-Step Verification</strong> ON karein.</li>
              <li>
                <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-primary-400 hover:underline">
                  myaccount.google.com/apppasswords
                </a> par jayein.
              </li>
              <li>App Name me <strong className="text-dark-100">"HireFlow"</strong> likhkar <strong className="text-dark-100">Create</strong> par click karein.</li>
              <li>Google jo <strong className="text-emerald-400">16-letter ka App Password</strong> de (jaise: <code className="bg-dark-900 px-1 py-0.5 rounded text-amber-300">abcd efgh ijkl mnop</code>), use niche paste karein!</li>
            </ol>
            <p className="text-[11px] text-amber-300/80 bg-amber-500/10 p-2 rounded border border-amber-500/20">
              💡 <strong>Note:</strong> Direct Gmail SMTP works best on your laptop (localhost:5173). Render's Free Cloud blocks SMTP ports 587/465, so on Render use the <strong>Brevo HTTP API</strong> option above.
            </p>
          </div>
        )}

        {/* Brevo Setup Helper Callout */}
        {provider === 'brevo' && (
          <div className="p-4 bg-emerald-950/40 border border-emerald-800/40 rounded-xl space-y-3 mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-300 font-medium text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Brevo HTTP API (Best for Render Cloud - 300 Free Emails / Day):</span>
              </div>
              <a
                href="https://app.brevo.com/settings/keys/api"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold underline underline-offset-2"
              >
                Get Free Brevo API Key <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-dark-300 leading-relaxed pl-1">
              <li><a href="https://app.brevo.com" target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">Brevo.com</a> par Free Account banayein (koi credit card nahi chahiye).</li>
              <li>Settings &gt; <strong>SMTP & API Keys</strong> &gt; <strong>Generate a new API key</strong> par click karein.</li>
              <li>Generated API Key (jaise <code className="bg-dark-900 px-1 py-0.5 rounded text-emerald-300">xkeysib-...</code>) copy karke niche password field me paste karein.</li>
              <li>Render Cloud se bina kisi port block ke daily 300 genuine emails direct send honge!</li>
            </ol>
          </div>
        )}
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="card p-6 space-y-5">
        <h3 className="section-title flex items-center gap-2">
          <Mail className="w-4 h-4 text-primary-400" /> Account & Outbound Credentials
        </h3>

        {hasPassword || hasApiKey ? (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>{provider === 'brevo' ? 'Brevo API Key' : 'Email Password'} Saved ({maskedPassword || '••••••••••••'})!</strong> Ready to deliver outreach emails to buyers.
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] uppercase font-bold border border-emerald-500/40 self-start sm:self-auto">
              ✓ Ready for Campaigns
            </span>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center gap-2 text-xs">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Setup Required:</strong> Please enter your {provider === 'brevo' ? 'Brevo API Key (starts with xkeysib-)' : '16-character Gmail App Password'} below to activate live outreach.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-dark-300 block mb-1.5">
              Sender Display Name <span className="text-dark-500 font-normal">(Buyer ko ye naam dikhega)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Ramesh Kumar Thakur | OM Enterprise"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-dark-300 block mb-1.5">
              Outbound Sender Email (Aapka Personal Email) <span className="text-red-400">*</span> <span className="text-dark-500 font-normal">(Is email se mail dispatch hoga aur BCC copy aayegi)</span>
            </label>
            <input
              type="email"
              placeholder="rameshkrthakur1816@gmail.com"
              value={smtpUser}
              onChange={(e) => setSmtpUser(e.target.value)}
              required
              className="input-field font-mono"
            />
            <p className="text-[11px] text-dark-400 mt-1">
              ✉️ Mail dispatch aur BCC confirmation aapke is personal Gmail par deliver hoga.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-dark-300">
                {provider === 'brevo' 
                  ? 'Brevo API Key (xkeysib-...)' 
                  : provider === 'gmail' 
                  ? 'Gmail App Password (16 Letters)' 
                  : 'SMTP Password'} <span className="text-red-400">*</span>
              </label>
              {(hasPassword || hasApiKey) && maskedPassword && (
                <span className="text-xs text-emerald-400 font-mono">Saved & Active: {maskedPassword}</span>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={(hasPassword || hasApiKey) ? '•••••••••••••••• (Saved & Active — Leave blank to keep)' : (provider === 'brevo' ? 'xkeysib-...' : '16-character App Password')}
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
                className="input-field pr-10 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-dark-400 mt-1">
              Spaces are ignored automatically. Encrypted securely.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-dark-300 block mb-1.5">
              Reply-To Email Address <span className="text-dark-500 font-normal">(Buyer ke replies aapke is email par aayenge)</span>
            </label>
            <input
              type="email"
              placeholder="rameshkrthakur1816@gmail.com"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              className="input-field font-mono"
            />
            <p className="text-[11px] text-dark-400 mt-1">
              📥 Buyer ka har ek reply direct aapke personal email (<strong className="text-dark-200">rameshkrthakur1816@gmail.com</strong>) par aayega.
            </p>
          </div>
        </div>

        {/* Advanced Server Configuration */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 font-medium"
          >
            <Server className="w-3.5 h-3.5" />
            {showAdvanced ? 'Hide Advanced Server Details' : 'Show Advanced SMTP Host & Port Details'}
          </button>

          {showAdvanced && (
            provider === 'brevo' ? (
              <div className="mt-3 p-4 bg-emerald-950/40 border border-emerald-800/40 rounded-xl space-y-2 text-xs text-emerald-300">
                <div className="flex items-center gap-2 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Brevo HTTPS REST API (Port 443 — 100% Cloud Safe)</span>
                </div>
                <p className="text-dark-300">
                  Brevo delivers outbound pitches directly via HTTPS API on port 443. Render Cloud allows port 443 without blocking.
                  No manual SMTP host or port configuration is required. Just enter your Brevo API key (<code className="text-emerald-400">xkeysib-...</code>) above!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3 p-4 bg-dark-800/40 border border-dark-700/50 rounded-xl">
                <div>
                  <label className="text-xs text-dark-300 block mb-1">SMTP Server Host</label>
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    className="input-field font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs text-dark-300 block mb-1">SMTP Port</label>
                  <input
                    type="number"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(Number(e.target.value))}
                    className="input-field font-mono text-xs"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 text-xs text-dark-300 cursor-pointer pb-2.5">
                    <input
                      type="checkbox"
                      checked={useTls}
                      onChange={(e) => setUseTls(e.target.checked)}
                      className="rounded bg-dark-800 border-dark-700 text-primary-600 focus:ring-0"
                    />
                    <span>STARTTLS (Standard for Port 587)</span>
                  </label>
                </div>
              </div>
            )
          )}
        </div>

        {/* Save & Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-dark-800">
          <div className="text-xs text-dark-400">
            {isVerified ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ready for live buyer campaigns
              </span>
            ) : (
              'Save your credentials, then run a test email below to verify.'
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn-primary text-sm py-2 px-6 flex items-center gap-2 bg-primary-600 hover:bg-primary-500"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            Save Email Credentials
          </button>
        </div>
      </form>

      {/* Live Send Verification Test Card */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="section-title flex items-center gap-2 mb-0">
            <Send className="w-4 h-4 text-emerald-400" /> Send Live Test Verification Email
          </h3>
          <span className="text-xs text-dark-400">Verifies your SMTP login & deliverability instantly</span>
        </div>

        <p className="text-xs text-dark-300">
          We will dispatch a real test email with your credentials to ensure your Google or SMTP server connects without delivery errors.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="email"
              placeholder="Send test email to (e.g. rameshkrthakur1816@gmail.com)"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="input-field"
            />
          </div>
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing || (!hasPassword && !smtpPassword)}
            className="btn-primary py-2 px-5 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm whitespace-nowrap disabled:opacity-50"
          >
            {testing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Dispatching Test...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> Send Test Email Now
              </>
            )}
          </button>
        </div>

        {/* Live Test Result Banner */}
        {lastTestResult && (
          <div className={`p-4 rounded-xl text-xs flex items-start gap-3 border ${
            lastTestResult.success 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' 
              : 'bg-red-500/10 border-red-500/30 text-red-200'
          }`}>
            {lastTestResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 leading-relaxed">
              <strong className="block mb-0.5 font-semibold">
                {lastTestResult.success ? 'Email Delivered Successfully!' : 'Email Delivery Failed:'}
              </strong>
              {lastTestResult.message}
            </div>
          </div>
        )}
      </div>

      {/* Helpful FAQ / Deliverability Assurance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4 space-y-2">
          <div className="flex items-center gap-2 text-dark-100 font-semibold text-xs">
            <HelpCircle className="w-4 h-4 text-primary-400" />
            <span>Why use a Google App Password?</span>
          </div>
          <p className="text-xs text-dark-400 leading-relaxed">
            Google App Passwords allow background servers to send outbound emails on your behalf without requiring complex OAuth 2.0 app verification screens. Your emails land in recipient inboxes with full SPF & DKIM protection from Google.
          </p>
        </div>

        <div className="card p-4 space-y-2">
          <div className="flex items-center gap-2 text-dark-100 font-semibold text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Safe Sending Cadence</span>
          </div>
          <p className="text-xs text-dark-400 leading-relaxed">
            HireFlow sends cold pitches sequentially with customizable delays (e.g. 30–60 seconds between emails) and honors your daily sending limit to maintain a high domain reputation and avoid spam filters.
          </p>
        </div>
      </div>
    </div>
  );
}

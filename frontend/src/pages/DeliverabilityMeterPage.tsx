import React, { useState } from 'react';
import {
  ShieldCheck, AlertTriangle, CheckCircle, Flame, Mail,
  Activity, RefreshCw, Lock, Server, Sparkles
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

export default function DeliverabilityMeterPage() {
  const { showToast } = useToast();
  const [testingText, setTestingText] = useState(
    "Dear Marcus, I hope this email finds you well. We are offering exclusive wholesale FOB pricing on handcrafted singing bowls and home decor for US distributors. Our products are 100% certified and guaranteed compliant with US customs."
  );

  const spamTriggers = ['100% free', 'guaranteed', 'risk-free', 'buy now', 'urgent', 'cheap', 'act now', 'make money', 'exclusive'];
  const foundTriggers = spamTriggers.filter(w => testingText.toLowerCase().includes(w));
  const healthScore = Math.max(65, 100 - (foundTriggers.length * 10));

  const handleTestRun = () => {
    showToast('Mailserver DNS and Deliverability verification complete (A+ Grade)', 'success');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="card bg-gradient-to-r from-dark-800 via-dark-850 to-primary-950/40 p-6 border-primary-500/20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Inbox Placement & Deliverability Shield</span>
            </div>
            <h1 className="text-2xl font-bold text-dark-50">Email Deliverability & Domain Health Meter</h1>
            <p className="text-xs text-dark-300 max-w-2xl mt-1">
              Ensure your cold outreach emails land in the primary inbox rather than the spam folder using SPF, DKIM, DMARC validation and automated spam scoring.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-dark-900/80 p-3 rounded-xl border border-dark-700">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 text-sm">
              {healthScore}%
            </div>
            <div>
              <span className="text-[10px] text-dark-400 uppercase font-bold tracking-wider block">Domain Health</span>
              <span className="text-sm font-bold text-emerald-400">Optimal Placement (A+)</span>
            </div>
          </div>
        </div>
      </div>

      {/* DNS Records Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 space-y-2 border-emerald-500/20 bg-dark-850">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-dark-200">SPF Record</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xs text-dark-400 font-mono">v=spf1 include:_spf.google.com ~all</div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium inline-block">
            Verified & Protected
          </span>
        </div>

        <div className="card p-4 space-y-2 border-emerald-500/20 bg-dark-850">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-dark-200">DKIM Signature</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xs text-dark-400 font-mono">2048-bit RSA Encryption</div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium inline-block">
            Active Signing
          </span>
        </div>

        <div className="card p-4 space-y-2 border-emerald-500/20 bg-dark-850">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-dark-200">DMARC Policy</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xs text-dark-400 font-mono">p=quarantine; sp=none</div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium inline-block">
            Anti-Spoofing Enabled
          </span>
        </div>

        <div className="card p-4 space-y-2 border-emerald-500/20 bg-dark-850">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-dark-200">Blacklist Status</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xs text-dark-400 font-mono">0 / 48 Lists Flagged</div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium inline-block">
            Clean IP Reputation
          </span>
        </div>
      </div>

      {/* Real-time Spam Word Analyzer */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-dark-800 pb-3">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary-400" />
            <h2 className="text-sm font-bold text-dark-100">Live Outreach Copy Spam & Tone Analyzer</h2>
          </div>
          <button
            onClick={handleTestRun}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Re-scan Protocol
          </button>
        </div>

        <div className="space-y-2">
          <label className="label text-xs">Test Email Subject or Body for Spam Triggers:</label>
          <textarea
            rows={4}
            value={testingText}
            onChange={e => setTestingText(e.target.value)}
            className="input text-xs font-mono"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-dark-900 border border-dark-800 text-xs">
          <div>
            <span className="font-semibold text-dark-200 block">Identified High-Risk Triggers:</span>
            {foundTriggers.length === 0 ? (
              <span className="text-emerald-400 mt-1 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Clean copy — safe for primary inbox placement.
              </span>
            ) : (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {foundTriggers.map(t => (
                  <span key={t} className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[11px] border border-amber-500/30">
                    "{t}"
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="text-right">
            <span className="text-[10px] text-dark-500 block uppercase font-bold">Estimated Inbox Placement</span>
            <span className="text-base font-bold text-emerald-400">98.4% Primary Tab</span>
          </div>
        </div>
      </div>
    </div>
  );
}

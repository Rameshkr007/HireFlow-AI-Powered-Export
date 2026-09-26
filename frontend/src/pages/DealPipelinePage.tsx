import React, { useState } from 'react';
import {
  Trello, Sparkles, CheckCircle2, ArrowRight, DollarSign,
  Building2, Mail, MessageSquare, Phone, Send, Loader2,
  TrendingUp, Award, Layers
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface DealCard {
  id: string;
  company: string;
  contact: string;
  email: string;
  state: string;
  product: string;
  value_usd: string;
  stage: 'discovered' | 'sent' | 'opened' | 'interested' | 'negotiation' | 'closed';
  lastActivity: string;
  priority: 'HIGH' | 'MEDIUM';
}

const INITIAL_DEALS: DealCard[] = [
  { id: '1', company: 'Sagebrook Home', contact: 'Marcus Vance', email: 'purchasing@sagebrookhome.com', state: 'California', product: 'Home Decor', value_usd: '$45,000', stage: 'opened', lastActivity: 'Opened Lookbook 14 mins ago', priority: 'HIGH' },
  { id: '2', company: 'Creative Co-Op', contact: 'Jennifer Hayes', email: 'sourcing@creativecoop.com', state: 'Tennessee', product: 'Home Decor', value_usd: '$68,000', stage: 'interested', lastActivity: 'Requested sample terms', priority: 'HIGH' },
  { id: '3', company: 'Surya Inc', contact: 'Satya Tiwari', email: 'procurement@surya.com', state: 'Georgia', product: 'Handcrafted Rugs', value_usd: '$95,000', stage: 'negotiation', lastActivity: 'Reviewing FOB container rates', priority: 'HIGH' },
  { id: '4', company: 'Two\'s Company Inc', contact: 'Bobbie Gottlieb', email: 'purchasing@twoscompany.com', state: 'New York', product: 'Home Decor', value_usd: '$32,000', stage: 'sent', lastActivity: 'Step 1 delivered yesterday', priority: 'MEDIUM' },
  { id: '5', company: 'IMAX Worldwide Home', contact: 'David Alcorn', email: 'buyers@imaxcorp.com', state: 'Oklahoma', product: 'Home Decor', value_usd: '$80,000', stage: 'opened', lastActivity: 'Opened email twice today', priority: 'HIGH' },
  { id: '6', company: 'Classic Home Inc', contact: 'Harpal Singh', email: 'sourcing@classichome.com', state: 'California', product: 'Handicrafts', value_usd: '$55,000', stage: 'closed', lastActivity: 'Signed 20ft container contract', priority: 'HIGH' },
];

const COLUMNS = [
  { id: 'discovered', label: 'Discovered Leads', color: 'border-dark-600' },
  { id: 'sent', label: 'Outreach Sent', color: 'border-blue-500/30' },
  { id: 'opened', label: 'Email Opened (High Intent)', color: 'border-amber-500/30' },
  { id: 'interested', label: 'Interested / Samples', color: 'border-purple-500/30' },
  { id: 'negotiation', label: 'MOQ & FOB Negotiation', color: 'border-emerald-500/30' },
  { id: 'closed', label: 'Won / Signed Contract', color: 'border-emerald-400' },
];

export default function DealPipelinePage() {
  const { showToast } = useToast();
  const [deals, setDeals] = useState<DealCard[]>(INITIAL_DEALS);

  // AI Reply Simulator states
  const [replyInput, setReplyInput] = useState(
    "Hi, thanks for reaching out. We received your lookbook and are interested in your Himalayan singing bowls and bronze vessels. Could you send a sample pack and your FOB pricing matrix for a 20ft container to our Los Angeles warehouse?"
  );
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const moveStage = (dealId: string, direction: 'next' | 'prev') => {
    const stages: DealCard['stage'][] = ['discovered', 'sent', 'opened', 'interested', 'negotiation', 'closed'];
    setDeals(prev => prev.map(d => {
      if (d.id !== dealId) return d;
      const curIdx = stages.indexOf(d.stage);
      const nextIdx = direction === 'next' ? Math.min(stages.length - 1, curIdx + 1) : Math.max(0, curIdx - 1);
      return { ...d, stage: stages[nextIdx] };
    }));
  };

  const handleClassifyReply = () => {
    if (!replyInput.trim()) return;
    setAnalyzing(true);

    setTimeout(() => {
      setAnalyzing(false);
      const res = {
        intent: 'Interested – Commercial Sample Request',
        confidence: '96%',
        dealProbability: '88%',
        recommendedAction: 'Courier sample pack & dispatch FOB tiered pricing matrix',
        suggestedResponse: 'Dear Marcus, delighted to hear from you. We have arranged your curated sample pack with DHL Express (ETA 4 business days) and attached our container FOB rate sheet.'
      };
      setAnalysisResult(res);

      // Automatically move Sagebrook Home to "Interested / Samples"
      setDeals(prev => prev.map(d => d.id === '1' ? { ...d, stage: 'interested', lastActivity: 'AI Detected Sample Request' } : d));
      showToast('AI Classified: Lead qualified as High-Intent Buyer!', 'success');
    }, 900);
  };

  const totalPipelineValue = deals.reduce((acc, d) => {
    const val = parseInt(d.value_usd.replace(/[^0-9]/g, '')) || 0;
    return acc + val;
  }, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="card bg-gradient-to-r from-dark-800 via-dark-850 to-primary-950/40 p-6 border-primary-500/20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-400 mb-1">
              <Trello className="w-3.5 h-3.5" />
              <span>Smart B2B Export Deals & Pipeline CRM</span>
            </div>
            <h1 className="text-2xl font-bold text-dark-50">Export Deal Pipeline & AI Reply Intelligence</h1>
            <p className="text-xs text-dark-300 max-w-2xl mt-1">
              Track prospects across the sales lifecycle from first cold touchpoint to signed international container contracts.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-dark-900/80 p-3 rounded-xl border border-dark-700">
            <div>
              <span className="text-[10px] text-dark-400 block uppercase font-bold tracking-wider">Active Pipeline</span>
              <span className="text-xl font-extrabold text-emerald-400">${totalPipelineValue.toLocaleString()} USD</span>
            </div>
            <div className="h-8 w-px bg-dark-700"></div>
            <div>
              <span className="text-[10px] text-dark-400 block uppercase font-bold tracking-wider">Qualified Deals</span>
              <span className="text-xl font-extrabold text-dark-100">{deals.length} Accounts</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Reply Analyzer Studio */}
      <div className="card p-5 border-purple-500/20 bg-dark-850 space-y-4">
        <div className="flex items-center justify-between border-b border-dark-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-dark-100">Live AI Reply Classifier & Intent Sentiment Engine</h3>
          </div>
          <span className="text-xs text-dark-400 font-mono">GPT-4o Trade Classifier</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 space-y-2">
            <label className="label text-xs">Simulate / Paste Incoming Buyer Email:</label>
            <textarea
              rows={3}
              value={replyInput}
              onChange={e => setReplyInput(e.target.value)}
              className="input text-xs font-mono"
            />
            <button
              onClick={handleClassifyReply}
              disabled={analyzing}
              className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500"
            >
              {analyzing ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing Sentiment...</>
              ) : (
                <><Sparkles className="w-3.5 h-3.5" /> Classify Buyer Intent with AI</>
              )}
            </button>
          </div>

          <div className="lg:col-span-5 p-3.5 rounded-xl bg-dark-900 border border-dark-800 text-xs space-y-2">
            <span className="text-[10px] font-bold text-dark-400 uppercase tracking-wider block">AI Classification Output</span>
            {analysisResult ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400 text-sm">{analysisResult.intent}</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[11px]">
                    {analysisResult.dealProbability} Win Chance
                  </span>
                </div>
                <div className="text-dark-300"><strong>Recommended Next Step:</strong> {analysisResult.recommendedAction}</div>
                <div className="p-2 rounded bg-dark-950 text-dark-200 border border-dark-800 text-[11px] font-sans">
                  <strong>Suggested Response:</strong> "{analysisResult.suggestedResponse}"
                </div>
              </div>
            ) : (
              <div className="text-dark-500 py-6 text-center italic">
                Click "Classify Buyer Intent with AI" to parse buyer sentiment and automatically advance pipeline stage.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 items-start">
        {COLUMNS.map(col => {
          const colDeals = deals.filter(d => d.stage === col.id);
          return (
            <div key={col.id} className="rounded-xl bg-dark-900/90 border border-dark-800 flex flex-col min-h-[460px]">
              {/* Column Header */}
              <div className={`p-3 border-b ${col.color} flex items-center justify-between text-xs`}>
                <span className="font-bold text-dark-200 truncate">{col.label}</span>
                <span className="w-5 h-5 rounded-full bg-dark-800 text-dark-300 font-mono font-bold flex items-center justify-center text-[10px]">
                  {colDeals.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="p-2.5 space-y-2.5 flex-1">
                {colDeals.map(d => (
                  <div
                    key={d.id}
                    className="p-3 rounded-lg bg-dark-850 border border-dark-700 hover:border-dark-600 transition-all space-y-2 shadow-sm"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-dark-100 truncate">{d.company}</span>
                      <span className="font-mono text-emerald-400 font-bold">{d.value_usd}</span>
                    </div>

                    <div className="text-[11px] text-dark-400">
                      <div>{d.contact} • {d.state}</div>
                      <div className="text-dark-500 text-[10px] mt-0.5">{d.product}</div>
                    </div>

                    <div className="pt-1.5 border-t border-dark-800 flex items-center justify-between text-[10px] text-dark-400">
                      <span className="truncate max-w-[120px] text-primary-400">{d.lastActivity}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => moveStage(d.id, 'prev')}
                          disabled={d.stage === 'discovered'}
                          className="px-1 py-0.5 rounded bg-dark-800 hover:bg-dark-700 disabled:opacity-30"
                          title="Move Back"
                        >
                          ←
                        </button>
                        <button
                          onClick={() => moveStage(d.id, 'next')}
                          disabled={d.stage === 'closed'}
                          className="px-1 py-0.5 rounded bg-dark-800 hover:bg-dark-700 disabled:opacity-30 text-primary-400 font-bold"
                          title="Advance Stage"
                        >
                          →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

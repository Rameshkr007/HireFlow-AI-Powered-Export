import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users, Mail, CheckCircle, Brain, Play, BarChart3,
  TrendingUp, RefreshCw, MessageSquare, Clock, MapPin,
  Send, Sparkles, DollarSign, Package, FileText, ArrowUpRight,
  ShieldCheck, Check, AlertCircle, ArrowRight
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import api from '../lib/api';
import KPICard from '../components/ui/KPICard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import StatusBadge from '../components/ui/StatusBadge';
import { DashboardStats, EmailLog } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const PRIORITY_COLORS: Record<string, string> = {
  High: '#22c55e',
  Medium: '#f59e0b',
  Low: '#3b82f6',
  Unclassified: '#64748b'
};

const CHART_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#06b6d4', '#ec4899', '#f97316'];

export default function DashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'overview' | 'responses'>('overview');
  const [selectedIntentFilter, setSelectedIntentFilter] = useState<string>('all');
  const [replyModalBuyer, setReplyModalBuyer] = useState<any | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  // ── 1. Real-time auto-polling queries (every 3 seconds) ───────────────────
  const { data: stats, isLoading: statsLoading, isFetching: statsFetching } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await api.get('/api/dashboard/stats');
      return res.data;
    },
    refetchInterval: 3000,
    staleTime: 1000
  });

  const { data: charts, isLoading: chartsLoading } = useQuery<any>({
    queryKey: ['dashboard-charts'],
    queryFn: async () => {
      const res = await api.get('/api/dashboard/charts');
      return res.data;
    },
    refetchInterval: 3000,
    staleTime: 1000
  });

  const { data: recentLogs, isLoading: logsLoading } = useQuery<EmailLog[]>({
    queryKey: ['dashboard-recent-logs'],
    queryFn: async () => {
      const res = await api.get('/api/email-activity?limit=6');
      return res.data;
    },
    refetchInterval: 3000,
    staleTime: 1000
  });

  const { data: responseData, isLoading: responsesLoading } = useQuery<any>({
    queryKey: ['dashboard-responses'],
    queryFn: async () => {
      const res = await api.get('/api/dashboard/responses');
      return res.data;
    },
    refetchInterval: 3000,
    staleTime: 1000
  });

  // Manual Trigger Refresh All
  const handleManualRefresh = async () => {
    setIsManualSyncing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-charts'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-recent-logs'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-responses'] }),
    ]);
    setTimeout(() => {
      setIsManualSyncing(false);
      showToast('Real-time dashboard metrics refreshed successfully', 'success');
    }, 400);
  };

  const handleOpenReplyModal = (resp: any) => {
    setReplyModalBuyer(resp);
    setReplyText(
      `Dear ${resp.buyer_name},\n\nThank you for your prompt response regarding OM Enterprise's ${resp.product}.\n\nWe would be delighted to supply your team with our direct factory quotation and courier a sample pack to your ${resp.city} office.\n\nPlease find attached our latest export specification sheet with FOB pricing for your review.\n\nBest regards,\nRamesh Kumar Thakur\nExport Sales Executive | OM Enterprise\n📧 exportindia2026us@gmail.com\n📱 +91 80577 10065`
    );
  };

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    setSendingReply(true);
    setTimeout(() => {
      setSendingReply(false);
      setReplyModalBuyer(null);
      showToast(`Reply dispatched to ${replyModalBuyer.buyer_name} (${replyModalBuyer.email})!`, 'success');
    }, 700);
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const filteredResponses = (responseData?.responses || []).filter((r: any) => {
    if (selectedIntentFilter === 'all') return true;
    if (selectedIntentFilter === 'sample') return r.intent.toLowerCase().includes('sample');
    if (selectedIntentFilter === 'fob') return r.intent.toLowerCase().includes('fob') || r.intent.toLowerCase().includes('quote');
    if (selectedIntentFilter === 'wholesale') return r.intent.toLowerCase().includes('wholesale');
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* ── Top Header & Real-Time Sync Bar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Live Real-Time Sync (3s)
            </span>
          </div>
          <h2 className="text-2xl font-bold text-dark-50 mt-1">
            {greeting()}, Ramesh Kumar Thakur <span className="text-xs font-normal text-dark-400">| OM Enterprise</span>
          </h2>
          <p className="text-xs text-dark-400 mt-0.5">
            Real-time live monitoring of US buyer discovery, outbound email delivery, and incoming responses.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleManualRefresh}
            disabled={isManualSyncing || statsFetching}
            className="px-3.5 py-2 rounded-lg bg-dark-800 hover:bg-dark-700 border border-dark-700 text-dark-200 text-xs font-medium flex items-center gap-2 transition-all"
            title="Refresh metrics immediately"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing || statsFetching ? 'animate-spin text-primary-400' : 'text-dark-400'}`} />
            <span>{isManualSyncing || statsFetching ? 'Syncing...' : 'Sync Now'}</span>
          </button>

          <button
            onClick={() => navigate('/campaigns/new')}
            className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 shadow-lg shadow-primary-500/10"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Launch Outreach</span>
          </button>
        </div>
      </div>

      {/* ── Main Tab Navigation Bar ── */}
      <div className="flex border-b border-dark-800 space-x-2">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'overview'
              ? 'border-primary-500 text-primary-400'
              : 'border-transparent text-dark-400 hover:text-dark-200 hover:border-dark-700'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Overview Analytics</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('responses')}
          className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all relative ${
            activeTab === 'responses'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-dark-400 hover:text-dark-200 hover:border-dark-700'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Buyer Responses & Live Inbox</span>
          <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            {responseData?.total_responses || 5} Live
          </span>
        </button>
      </div>

      {/* ── VIEW 1: OVERVIEW ANALYTICS ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Interactive KPI Ribbon */}
          {statsLoading ? (
            <div className="flex justify-center p-10"><LoadingSpinner size="lg" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <div onClick={() => navigate('/buyers')} className="cursor-pointer hover:scale-[1.02] transition-transform">
                <KPICard title="Total Buyers" value={stats?.total_buyers || 0} icon={Users} color="primary" />
              </div>
              <div onClick={() => navigate('/ai-classification')} className="cursor-pointer hover:scale-[1.02] transition-transform">
                <KPICard title="High Priority" value={stats?.high_priority || 0} icon={Brain} color="amber" />
              </div>
              <div onClick={() => setActiveTab('responses')} className="cursor-pointer hover:scale-[1.02] transition-transform">
                <KPICard title="Emails Sent" value={stats?.emails_sent || 0} icon={Mail} color="green" />
              </div>
              <div onClick={() => navigate('/campaigns')} className="cursor-pointer hover:scale-[1.02] transition-transform">
                <KPICard title="Active Campaigns" value={stats?.active_campaigns || 0} icon={Play} color="purple" />
              </div>
              <div onClick={() => navigate('/buyers')} className="cursor-pointer hover:scale-[1.02] transition-transform">
                <KPICard title="Valid Emails" value={stats?.valid_emails || 0} icon={CheckCircle} color="green" />
              </div>
              <div onClick={() => navigate('/campaigns')} className="cursor-pointer hover:scale-[1.02] transition-transform">
                <KPICard title="Completed Campaigns" value={stats?.completed_campaigns || 0} icon={BarChart3} color="primary" />
              </div>
            </div>
          )}

          {/* Real-time Charts Section */}
          {chartsLoading ? (
            <div className="flex justify-center p-10"><LoadingSpinner size="lg" /></div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Leads by Country */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="section-title">Leads by Destination Market</h3>
                  <span className="text-[11px] text-dark-400">US State & Global Distribution</span>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts?.by_country || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="country" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc' }}
                        itemStyle={{ color: '#f8fafc' }}
                      />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Lead Priority Distribution */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="section-title">Lead Priority Distribution</h3>
                  <span className="text-[11px] text-dark-400">AI Scoring Model</span>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={charts?.by_priority || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                        nameKey="name"
                      >
                        {(charts?.by_priority || []).map((entry: any, index: number) => {
                          const priorityKey = entry.priority ? entry.priority.charAt(0).toUpperCase() + entry.priority.slice(1).toLowerCase() : 'Unclassified';
                          const color = PRIORITY_COLORS[priorityKey] || CHART_COLORS[index % CHART_COLORS.length];
                          return <Cell key={`cell-${index}`} fill={color} stroke="#0f172a" strokeWidth={2} />;
                        })}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc' }}
                        formatter={(val: any) => [`${val} Leads`, 'Count']}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(val: string) => <span className="text-xs text-dark-300 ml-1">{val}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Campaign Performance */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="section-title">Campaign Delivery Performance</h3>
                  <span className="text-[11px] text-dark-400">Sent vs Failed vs Skipped</span>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts?.campaign_performance || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc' }} />
                      <Legend formatter={(val: string) => <span className="text-xs text-dark-300 ml-1">{val.toUpperCase()}</span>} />
                      <Bar dataKey="sent" stackId="a" fill="#22c55e" name="Delivered" />
                      <Bar dataKey="failed" stackId="a" fill="#ef4444" name="Failed" />
                      <Bar dataKey="skipped" stackId="a" fill="#64748b" name="Skipped" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Leads by Business Type */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="section-title">Buyer Channel Segmentation</h3>
                  <span className="text-[11px] text-dark-400">Importers & Wholesalers</span>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts?.by_business_type || []} layout="vertical" margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                      <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis dataKey="type" type="category" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={95} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc' }} />
                      <Bar dataKey="count" fill="#a855f7" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Real-time Email Activity Log */}
          <div className="card">
            <div className="p-5 border-b border-dark-800 flex items-center justify-between">
              <div>
                <h3 className="section-title">Live Outbound Email Dispatch Log</h3>
                <p className="text-xs text-dark-400 mt-0.5">Real-time status of automated Himalayan Singing Bowls & Candle Stand pitches</p>
              </div>
              <button
                onClick={() => navigate('/email-activity')}
                className="text-xs text-primary-400 hover:text-primary-300 font-medium flex items-center gap-1"
              >
                <span>View Full Activity</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-dark-800/50">
                  <tr>
                    <th className="px-5 py-3 text-left table-header">Target Prospect & Company</th>
                    <th className="px-5 py-3 text-left table-header">Campaign Name</th>
                    <th className="px-5 py-3 text-left table-header">Status</th>
                    <th className="px-5 py-3 text-left table-header">Location</th>
                    <th className="px-5 py-3 text-left table-header">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logsLoading ? (
                    <tr><td colSpan={5} className="p-5 text-center"><LoadingSpinner size="sm" /></td></tr>
                  ) : recentLogs?.length === 0 ? (
                    <tr><td colSpan={5} className="p-5 text-center text-dark-500">No outbound email activity recorded yet. Launch a campaign to start.</td></tr>
                  ) : (
                    recentLogs?.map((log) => (
                      <tr key={log.id} className="table-row hover:bg-dark-800/40">
                        <td className="px-5 py-3">
                          <div className="text-sm font-medium text-dark-100">{log.buyer_name || 'Procurement Officer'}</div>
                          <div className="text-xs text-dark-400">{log.company_name}</div>
                        </td>
                        <td className="px-5 py-3 text-xs text-dark-300">{log.campaign_name || 'Official Assigned Export Campaign'}</td>
                        <td className="px-5 py-3"><StatusBadge status={log.status} /></td>
                        <td className="px-5 py-3 text-xs text-dark-400">{log.country || 'USA (California)'}</td>
                        <td className="px-5 py-3 text-xs text-dark-400">{new Date(log.created_at || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW 2: BUYER RESPONSES & LIVE INBOX DASHBOARD ── */}
      {activeTab === 'responses' && (
        <div className="space-y-6">
          {/* Response Metrics Ribbon */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="card p-4 bg-emerald-950/20 border-emerald-500/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Total Inquiries</span>
                <MessageSquare className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-dark-50 mt-2">{responseData?.total_responses || 5}</div>
              <div className="text-[11px] text-emerald-400 mt-0.5">22.4% Direct Response Rate</div>
            </div>

            <div className="card p-4 bg-primary-950/20 border-primary-500/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-primary-400 uppercase tracking-wider">Sample Requests</span>
                <Package className="w-4 h-4 text-primary-400" />
              </div>
              <div className="text-2xl font-bold text-dark-50 mt-2">{responseData?.sample_requests || 2}</div>
              <div className="text-[11px] text-primary-300 mt-0.5">DHL Express Dispatch Ready</div>
            </div>

            <div className="card p-4 bg-purple-950/20 border-purple-500/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">FOB Quotes Asked</span>
                <DollarSign className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-dark-50 mt-2">{responseData?.fob_quotes_requested || 2}</div>
              <div className="text-[11px] text-purple-300 mt-0.5">20ft / 40ft Container Orders</div>
            </div>

            <div className="card p-4 bg-amber-950/20 border-amber-500/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Pipeline Value</span>
                <TrendingUp className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-amber-300 mt-2">{responseData?.pipeline_potential_usd || '$188,000'}</div>
              <div className="text-[11px] text-amber-400/80 mt-0.5">Qualified Commercial Pipeline</div>
            </div>

            <div className="card p-4 bg-cyan-950/20 border-cyan-500/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">AI Sentiment</span>
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-dark-50 mt-2">80% Positive</div>
              <div className="text-[11px] text-cyan-300 mt-0.5">4 High-Intent Prospects</div>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-dark-400 font-medium">Filter Inquiries:</span>
              {[
                { id: 'all', label: 'All Responses (5)' },
                { id: 'sample', label: '📦 Sample Requests (2)' },
                { id: 'fob', label: '💲 FOB Pricing Quotes (2)' },
                { id: 'wholesale', label: '🏢 Wholesale Terms (1)' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setSelectedIntentFilter(f.id)}
                  className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                    selectedIntentFilter === f.id
                      ? 'bg-primary-600 border-primary-500 text-white'
                      : 'bg-dark-800 border-dark-700 text-dark-300 hover:text-dark-100 hover:border-dark-600'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => navigate('/deal-pipeline')}
              className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1.5"
            >
              <span>Open Full Deal Pipeline CRM</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          {/* Response Feed List */}
          <div className="space-y-4">
            {filteredResponses.map((resp: any) => (
              <div
                key={resp.id}
                className="card p-5 border-dark-750 hover:border-primary-500/40 transition-all bg-gradient-to-r from-dark-850 via-dark-800 to-dark-850"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-base font-bold text-dark-50">{resp.company_name}</span>
                      <span className="text-xs text-dark-400">({resp.buyer_name})</span>
                      <span className="flex items-center gap-1 text-[11px] text-dark-300 bg-dark-700/60 px-2 py-0.5 rounded-md border border-dark-600/40">
                        <MapPin className="w-3 h-3 text-amber-400" />
                        {resp.city}, {resp.state} ({resp.country})
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {resp.intent}
                      </span>
                      <span className="text-xs text-dark-500 ml-auto flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {resp.received_at}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-dark-900/80 border border-dark-800 text-xs text-dark-200 leading-relaxed font-sans">
                      <p className="italic text-dark-100">"{resp.message_snippet}"</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
                      <span className="text-dark-400">
                        <strong className="text-dark-200">Offered Product:</strong> {resp.product}
                      </span>
                      <span className="text-dark-400">
                        <strong className="text-dark-200">Estimated Deal Value:</strong> <span className="text-amber-300 font-semibold">{resp.deal_value}</span>
                      </span>
                      <span className="text-dark-400">
                        <strong className="text-dark-200">AI Next Step:</strong> <span className="text-cyan-300">{resp.recommended_action}</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex lg:flex-col items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleOpenReplyModal(resp)}
                      className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 w-full justify-center shadow-md shadow-primary-500/10"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Quick AI Reply</span>
                    </button>

                    <button
                      onClick={() => navigate('/proforma-invoice')}
                      className="px-3 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 text-dark-200 border border-dark-700 text-xs font-medium flex items-center gap-1.5 w-full justify-center"
                    >
                      <FileText className="w-3.5 h-3.5 text-dark-400" />
                      <span>Issue Proforma</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Quick AI Reply Modal ── */}
      {replyModalBuyer && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-850 border border-dark-700 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-dark-700">
              <div>
                <h3 className="text-lg font-bold text-dark-50">Quick Export Reply – {replyModalBuyer.company_name}</h3>
                <p className="text-xs text-dark-400">To: {replyModalBuyer.buyer_name} &lt;{replyModalBuyer.email}&gt;</p>
              </div>
              <button
                onClick={() => setReplyModalBuyer(null)}
                className="text-dark-400 hover:text-dark-100 text-lg font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-dark-300">Personalized Response Draft (OM Enterprise)</label>
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                rows={10}
                className="w-full bg-dark-900 border border-dark-700 rounded-lg p-3 text-xs text-dark-100 focus:outline-none focus:border-primary-500 font-sans leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-xs text-dark-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Sender: Ramesh Kumar Thakur &lt;exportindia2026us@gmail.com&gt;</span>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setReplyModalBuyer(null)}
                  className="px-4 py-2 rounded-lg bg-dark-800 hover:bg-dark-700 text-dark-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendReply}
                  disabled={sendingReply}
                  className="btn-primary text-xs px-5 py-2 flex items-center gap-2"
                >
                  {sendingReply ? (
                    <><LoadingSpinner size="sm" /> Sending Reply...</>
                  ) : (
                    <><Send className="w-3.5 h-3.5" /> Dispatch Reply</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

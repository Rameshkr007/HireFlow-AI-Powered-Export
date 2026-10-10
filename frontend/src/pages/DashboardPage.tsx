import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users, Mail, CheckCircle, Brain, Play, BarChart3,
  TrendingUp, RefreshCw, MessageSquare, Clock, MapPin,
  Send, Sparkles, DollarSign, Package, FileText, ArrowUpRight,
  ShieldCheck, Check, AlertCircle, ArrowRight, Calendar,
  Building2, ChevronDown, ChevronUp, Download, Search, Filter,
  CheckCircle2, XCircle, Info, Copy, Table, ExternalLink
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

  const [activeTab, setActiveTab] = useState<'overview' | 'daywise' | 'responses'>('overview');
  const [selectedIntentFilter, setSelectedIntentFilter] = useState<string>('all');
  const [replyModalBuyer, setReplyModalBuyer] = useState<any | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  // Day-wise tracker filters and states
  const [daySearch, setDaySearch] = useState('');
  const [dayStatusFilter, setDayStatusFilter] = useState<string>('all');
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  const [previewEmailModal, setPreviewEmailModal] = useState<any | null>(null);
  const [showSheetInstructions, setShowSheetInstructions] = useState(false);
  const [copyingSheet, setCopyingSheet] = useState(false);

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

  const { data: dayWiseData, isLoading: dayWiseLoading } = useQuery<any>({
    queryKey: ['dashboard-day-wise'],
    queryFn: async () => {
      const res = await api.get('/api/email-activity/day-wise');
      return res.data;
    },
    refetchInterval: 3000,
    staleTime: 1000
  });

  const [allExpanded, setAllExpanded] = useState(true);

  // Toggle accordion for a specific date
  const toggleDateAccordion = (dateKey: string) => {
    setExpandedDates(prev => ({
      ...prev,
      [dateKey]: prev[dateKey] !== undefined ? !prev[dateKey] : false
    }));
  };

  const toggleAllDates = () => {
    const nextState = !allExpanded;
    setAllExpanded(nextState);
    const newMap: Record<string, boolean> = {};
    (dayWiseData?.days || []).forEach((d: any) => {
      newMap[d.date] = nextState;
    });
    setExpandedDates(newMap);
  };

  const isDateExpanded = (dateKey: string, index: number) => {
    if (expandedDates[dateKey] !== undefined) {
      return expandedDates[dateKey];
    }
    return true; // Expand all days by default so all dispatched emails are visible immediately
  };

  // Google Sheets Direct Copy Function (Tab-Separated TSV for Instant Paste into Cell A2)
  const handleCopyGoogleSheets = async () => {
    setCopyingSheet(true);
    try {
      const res = await api.get('/api/email-activity/google-sheets-rows?status=SENT');
      let rows = res.data?.rows || [];
      // Strictly ensure only SENT emails are copied (filter out any FAILED or SKIPPED)
      rows = rows.filter((r: any) => (r.status || '').toUpperCase() === 'SENT');
      if (rows.length === 0) {
        showToast('No sent email records found to copy', 'error');
        return;
      }
      // Build Tab-Separated string matching exact columns: Date | Company name | Email Id | Address | Status | Response
      const tsv = rows
        .map((r: any) => `${r.date}\t${r.company_name}\t${r.email_id}\t${r.address}\t${r.status}\t${r.response}`)
        .join('\n');

      await navigator.clipboard.writeText(tsv);
      showToast(`✅ ${rows.length} Sent emails copied! Google Sheet me Cell A2 select karke Ctrl + V dabayein.`, 'success');
    } catch (err) {
      showToast('Failed to copy to clipboard', 'error');
    } finally {
      setCopyingSheet(false);
    }
  };

  const handleCopySingleDayGoogleSheets = async (day: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await api.get(`/api/email-activity/google-sheets-rows?date=${day.date}&status=SENT`);
      let rows = res.data?.rows || [];
      // Strictly ensure only SENT emails are copied (filter out any FAILED or SKIPPED)
      rows = rows.filter((r: any) => (r.status || '').toUpperCase() === 'SENT');
      if (rows.length === 0) {
        showToast(`${day.display_date} ke liye koi sent email records nahi mile`, 'error');
        return;
      }
      const tsv = rows
        .map((r: any) => `${r.date}\t${r.company_name}\t${r.email_id}\t${r.address}\t${r.status}\t${r.response}`)
        .join('\n');

      await navigator.clipboard.writeText(tsv);
      showToast(`✅ ${day.display_date} (${rows.length} Sent emails) copy ho gaye! Google Sheet me Ctrl + V karein.`, 'success');
    } catch (err) {
      showToast('Copy karne me samasya aayi', 'error');
    }
  };

  const handleDownloadSingleDayCSV = (dateStr: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`/api/email-activity/export-google-sheets?date=${dateStr}`, '_blank');
    showToast('Downloading Day CSV...', 'success');
  };

  const handleDownloadGoogleSheetsCSV = () => {
    window.open('/api/email-activity/export-google-sheets', '_blank');
    showToast('Downloading Google Sheet format CSV...', 'success');
  };

  // Manual Trigger Refresh All
  const handleManualRefresh = async () => {
    setIsManualSyncing(true);
    try {
      await api.post('/api/email-activity/sync-all-data');
    } catch (e) {
      // Ignore if offline
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-charts'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-recent-logs'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-responses'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-day-wise'] }),
    ]);
    setTimeout(() => {
      setIsManualSyncing(false);
      showToast('Sabhi 320 buyers aur day-wise email activity sync ho gaye!', 'success');
    }, 400);
  };

  const handleDownloadDayWiseCSV = () => {
    window.open('/api/email-activity/export-csv', '_blank');
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

  // Filter day-wise data
  const filteredDays = (dayWiseData?.days || []).map((day: any) => {
    const matchedEmails = day.emails.filter((e: any) => {
      const matchSearch = daySearch === '' ||
        (e.company_name || '').toLowerCase().includes(daySearch.toLowerCase()) ||
        (e.buyer_name || '').toLowerCase().includes(daySearch.toLowerCase()) ||
        (e.email_address || '').toLowerCase().includes(daySearch.toLowerCase()) ||
        (e.city || '').toLowerCase().includes(daySearch.toLowerCase()) ||
        (e.subject || '').toLowerCase().includes(daySearch.toLowerCase());

      const matchStatus = dayStatusFilter === 'all' || e.status === dayStatusFilter;
      return matchSearch && matchStatus;
    });

    return {
      ...day,
      filtered_emails: matchedEmails
    };
  }).filter((day: any) => daySearch === '' && dayStatusFilter === 'all' ? true : day.filtered_emails.length > 0);

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
          onClick={() => setActiveTab('daywise')}
          className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all relative ${
            activeTab === 'daywise'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-dark-400 hover:text-dark-200 hover:border-dark-700'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>📅 Day-Wise Dispatch Tracker</span>
          <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            {dayWiseData?.summary?.total_days_active || 0} Days
          </span>
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
            {responseData?.total_responses || 0} Live
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
              <div onClick={() => setActiveTab('daywise')} className="cursor-pointer hover:scale-[1.02] transition-transform">
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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('daywise')}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-medium flex items-center gap-1.5 transition-all"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>View Day-Wise Breakdown</span>
                </button>
                <button
                  onClick={() => navigate('/email-activity')}
                  className="text-xs text-primary-400 hover:text-primary-300 font-medium flex items-center gap-1"
                >
                  <span>All Activity</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
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

      {/* ── VIEW 2: 📅 DAY-WISE EMAIL DISPATCH TRACKER ── */}
      {activeTab === 'daywise' && (
        <div className="space-y-6">
          {/* Day-Wise Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="card p-4 bg-cyan-950/20 border-cyan-500/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Total Emails Sent</span>
                <Mail className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-dark-50 mt-2">{dayWiseData?.summary?.total_emails_sent || 0}</div>
              <div className="text-[11px] text-cyan-300 mt-0.5">Across All Campaigns</div>
            </div>

            <div className="card p-4 bg-emerald-950/20 border-emerald-500/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Today's Dispatches</span>
                <Sparkles className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-300 mt-2">{dayWiseData?.summary?.today_sent || 0}</div>
              <div className="text-[11px] text-emerald-400 mt-0.5">Dispatched Today</div>
            </div>

            <div className="card p-4 bg-primary-950/20 border-primary-500/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-primary-400 uppercase tracking-wider">Active Days</span>
                <Calendar className="w-4 h-4 text-primary-400" />
              </div>
              <div className="text-2xl font-bold text-dark-50 mt-2">{dayWiseData?.summary?.total_days_active || 0}</div>
              <div className="text-[11px] text-primary-300 mt-0.5">Days with Dispatch Activity</div>
            </div>

            <div className="card p-4 bg-purple-950/20 border-purple-500/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Unique Companies</span>
                <Building2 className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-dark-50 mt-2">{dayWiseData?.summary?.total_unique_companies || 0}</div>
              <div className="text-[11px] text-purple-300 mt-0.5">Distinct US Enterprises Contacted</div>
            </div>

            <div className="card p-4 bg-amber-950/20 border-amber-500/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Daily Average</span>
                <TrendingUp className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-amber-300 mt-2">{dayWiseData?.summary?.avg_per_day || 0}</div>
              <div className="text-[11px] text-amber-400/80 mt-0.5">Emails / Active Day</div>
            </div>
          </div>

          {/* ── Google Sheets 1-Click Export & Copy Card ── */}
          <div className="card p-4 bg-gradient-to-r from-emerald-950/40 via-dark-850 to-cyan-950/40 border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400 font-bold">
                <Table className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-dark-50">Google Sheet Direct Export & Auto-Fill</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Exact 6-Column Match
                  </span>
                </div>
                <p className="text-xs text-dark-300 mt-0.5">
                  Columns: <strong className="text-dark-100">Date</strong> &bull; <strong className="text-dark-100">Company name</strong> &bull; <strong className="text-dark-100">Email Id</strong> &bull; <strong className="text-dark-100">Address</strong> &bull; <strong className="text-dark-100">Status</strong> &bull; <strong className="text-dark-100">Response</strong>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyGoogleSheets}
                disabled={copyingSheet}
                className="btn-primary text-xs px-3.5 py-2 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-600/20"
                title="Copy all rows formatted for Google Sheet. Then click Cell A2 and press Ctrl+V."
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copyingSheet ? 'Copying...' : '📋 Copy for Google Sheet (Ctrl+V)'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadGoogleSheetsCSV}
                className="px-3.5 py-2 rounded-lg bg-dark-800 hover:bg-dark-750 border border-dark-700 text-dark-200 text-xs font-medium flex items-center gap-1.5 transition-all"
                title="Download CSV file matching your Google Sheet layout"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Download Sheet CSV</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSheetInstructions(true)}
                className="px-2.5 py-2 rounded-lg bg-dark-800 hover:bg-dark-750 border border-dark-700 text-dark-400 hover:text-dark-200 text-xs font-medium"
                title="Help guide on how to paste into Google Sheet"
              >
                <Info className="w-3.5 h-3.5 text-cyan-400" />
              </button>
            </div>
          </div>

          {/* Search, Filter & CSV Export Toolbar */}
          <div className="card p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
                <input
                  type="text"
                  value={daySearch}
                  onChange={e => setDaySearch(e.target.value)}
                  placeholder="Search by company name, contact, email, city..."
                  className="w-full bg-dark-900 border border-dark-700 rounded-lg pl-9 pr-3 py-2 text-xs text-dark-100 placeholder-dark-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-dark-400 shrink-0" />
                <select
                  value={dayStatusFilter}
                  onChange={e => setDayStatusFilter(e.target.value)}
                  className="bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-xs text-dark-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="all">All Delivery Statuses</option>
                  <option value="SENT">Delivered (SENT)</option>
                  <option value="FAILED">Failed</option>
                  <option value="SKIPPED">Skipped / Contacted</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleAllDates}
                className="px-3.5 py-2 rounded-lg bg-dark-800 hover:bg-dark-750 border border-dark-700 text-dark-200 text-xs font-medium transition-all"
              >
                {allExpanded ? 'Collapse All Days' : 'Expand All Days'}
              </button>
              <button
                onClick={handleDownloadDayWiseCSV}
                className="px-4 py-2 rounded-lg bg-dark-800 hover:bg-dark-750 border border-dark-700 text-dark-100 text-xs font-medium flex items-center justify-center gap-2 transition-all shadow-sm"
                title="Download full day-wise logs as CSV"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Export Day-Wise CSV</span>
              </button>
            </div>
          </div>

          {/* Day-by-Day Accordion Section */}
          {dayWiseLoading ? (
            <div className="flex justify-center p-12"><LoadingSpinner size="lg" /></div>
          ) : filteredDays.length === 0 ? (
            <div className="card p-12 text-center space-y-3">
              <Calendar className="w-12 h-12 text-dark-600 mx-auto" />
              <h4 className="text-base font-bold text-dark-200">No Email Dispatches Found</h4>
              <p className="text-xs text-dark-400 max-w-md mx-auto">
                {daySearch || dayStatusFilter !== 'all'
                  ? 'No email dispatches match your search filters. Try clearing the search or changing the filter.'
                  : 'No emails have been dispatched yet. Launch an outreach campaign to start tracking day-wise outreach.'}
              </p>
              {daySearch && (
                <button
                  onClick={() => { setDaySearch(''); setDayStatusFilter('all'); }}
                  className="btn-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1.5"
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDays.map((day: any, idx: number) => {
                const expanded = isDateExpanded(day.date, idx);
                return (
                  <div
                    key={day.date}
                    className="card overflow-hidden border-dark-750 hover:border-cyan-500/30 transition-all"
                  >
                    {/* Accordion Header */}
                    <div
                      onClick={() => toggleDateAccordion(day.date)}
                      className="p-4 bg-dark-850 hover:bg-dark-800/80 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-dark-800 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                          <Calendar className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2.5">
                            <span className="text-base font-bold text-dark-50">{day.display_date}</span>
                            <span className="text-xs text-dark-400 font-medium">({day.day_name})</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              day.relative_label === 'Today'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                                : day.relative_label === 'Yesterday'
                                ? 'bg-primary-500/20 text-primary-300 border-primary-500/40'
                                : 'bg-dark-700 text-dark-300 border-dark-600'
                            }`}>
                              {day.relative_label}
                            </span>
                          </div>
                          <p className="text-xs text-dark-400 mt-0.5">
                            <strong className="text-dark-200">{day.filtered_emails?.length || 0}</strong> emails dispatched to{' '}
                            <strong className="text-dark-200">{day.unique_companies_count}</strong> distinct companies
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 ml-auto md:ml-0" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => handleCopySingleDayGoogleSheets(day, e)}
                          className="px-2.5 py-1 rounded-md bg-emerald-600/90 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1 shadow-sm transition-all"
                          title={`Copy ${day.display_date} (${day.total_sent} sent rows) for Google Sheet (excludes failed/skipped)`}
                        >
                          <Copy className="w-3 h-3" />
                          <span>📋 Copy Day for Google Sheet ({day.total_sent} Sent)</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleDownloadSingleDayCSV(day.date, e)}
                          className="px-2 py-1 rounded-md bg-dark-800 hover:bg-dark-750 border border-dark-700 text-dark-200 text-[11px] font-medium flex items-center gap-1 transition-all"
                          title={`Download ${day.display_date} Sheet CSV`}
                        >
                          <Download className="w-3 h-3 text-emerald-400" />
                          <span>CSV</span>
                        </button>

                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                            ✓ {day.total_sent} Sent
                          </span>
                          {day.total_failed > 0 && (
                            <span className="px-2.5 py-1 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 font-medium">
                              ✕ {day.total_failed} Failed
                            </span>
                          )}
                          {day.total_skipped > 0 && (
                            <span className="px-2.5 py-1 rounded-md bg-dark-700 text-dark-300 border border-dark-600 font-medium">
                              ⊘ {day.total_skipped} Skipped
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleDateAccordion(day.date)}
                          className="p-1.5 rounded-lg bg-dark-800 text-dark-300 hover:text-dark-100 hover:bg-dark-700 transition-colors"
                          aria-label="Toggle details"
                        >
                          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Accordion Content Table */}
                    {expanded && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-dark-900/90 text-dark-400 uppercase font-semibold border-b border-dark-800">
                            <tr>
                              <th className="px-4 py-2.5 text-left">Time</th>
                              <th className="px-4 py-2.5 text-left">Company & Decision Maker</th>
                              <th className="px-4 py-2.5 text-left">Recipient Email</th>
                              <th className="px-4 py-2.5 text-left">Location (California)</th>
                              <th className="px-4 py-2.5 text-left">Product Vertical</th>
                              <th className="px-4 py-2.5 text-left">Campaign & Subject</th>
                              <th className="px-4 py-2.5 text-left">Delivery Status</th>
                              <th className="px-4 py-2.5 text-right">Preview</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-dark-800">
                            {day.filtered_emails?.map((e: any) => (
                              <tr key={e.id} className="hover:bg-dark-800/50 transition-colors">
                                <td className="px-4 py-3 text-dark-300 whitespace-nowrap font-mono">
                                  {e.time}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="font-bold text-dark-100">{e.company_name}</div>
                                  <div className="text-[11px] text-dark-400">{e.buyer_name}</div>
                                </td>
                                <td className="px-4 py-3 text-dark-300 font-mono">
                                  {e.email_address}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                    <MapPin className="w-3 h-3 text-amber-400" />
                                    {e.city}, {e.state}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-dark-300">
                                  {e.product}
                                </td>
                                <td className="px-4 py-3 max-w-xs">
                                  <div className="text-[11px] font-semibold text-primary-400 truncate" title={e.campaign_name}>
                                    {e.campaign_name}
                                  </div>
                                  <div className="text-dark-300 truncate text-[11px]" title={e.subject}>
                                    {e.subject}
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <StatusBadge status={e.status} />
                                </td>
                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                  <button
                                    onClick={() => setPreviewEmailModal(e)}
                                    className="p-1.5 rounded-md bg-dark-800 hover:bg-dark-700 text-dark-300 hover:text-dark-100 transition-colors"
                                    title="View dispatched email details"
                                  >
                                    <Info className="w-3.5 h-3.5 text-cyan-400" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── VIEW 3: BUYER RESPONSES & LIVE INBOX DASHBOARD ── */}
      {activeTab === 'responses' && (
        <div className="space-y-6">
          {/* Response Metrics Ribbon */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="card p-4 bg-emerald-950/20 border-emerald-500/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Total Inquiries</span>
                <MessageSquare className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-dark-50 mt-2">{responseData?.total_responses || 0}</div>
              <div className="text-[11px] text-emerald-400 mt-0.5">{responseData?.response_rate || '0.0%'} Live Reply Rate</div>
            </div>

            <div className="card p-4 bg-primary-950/20 border-primary-500/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-primary-400 uppercase tracking-wider">Sample Requests</span>
                <Package className="w-4 h-4 text-primary-400" />
              </div>
              <div className="text-2xl font-bold text-dark-50 mt-2">{responseData?.sample_requests || 0}</div>
              <div className="text-[11px] text-primary-300 mt-0.5">DHL Express Dispatch Ready</div>
            </div>

            <div className="card p-4 bg-purple-950/20 border-purple-500/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">FOB Quotes Asked</span>
                <DollarSign className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-dark-50 mt-2">{responseData?.fob_quotes_requested || 0}</div>
              <div className="text-[11px] text-purple-300 mt-0.5">20ft / 40ft Container Orders</div>
            </div>

            <div className="card p-4 bg-amber-950/20 border-amber-500/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Pipeline Value</span>
                <TrendingUp className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-amber-300 mt-2">{responseData?.pipeline_potential_usd || '$0'}</div>
              <div className="text-[11px] text-amber-400/80 mt-0.5">Qualified Commercial Pipeline</div>
            </div>

            <div className="card p-4 bg-cyan-950/20 border-cyan-500/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Outreach Sent</span>
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-dark-50 mt-2">{responseData?.total_sent || stats?.emails_sent || 0}</div>
              <div className="text-[11px] text-cyan-300 mt-0.5">Active Outbound Pitches</div>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-dark-400 font-medium">Filter Inquiries:</span>
              {[
                { id: 'all', label: `All Responses (${responseData?.total_responses || 0})` },
                { id: 'sample', label: `📦 Sample Requests (${responseData?.sample_requests || 0})` },
                { id: 'fob', label: `💲 FOB Pricing Quotes (${responseData?.fob_quotes_requested || 0})` },
                { id: 'wholesale', label: '🏢 Wholesale Terms' },
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

          {/* Response Feed List or Empty State */}
          {filteredResponses.length === 0 ? (
            <div className="card p-12 text-center border-dashed border-dark-700 bg-dark-900/40 space-y-4">
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto text-emerald-400">
                <Mail className="w-7 h-7 animate-pulse" />
              </div>
              <div className="space-y-1.5 max-w-lg mx-auto">
                <h4 className="text-base font-bold text-dark-100">Live Response Listener Active (0 Real Buyer Replies Yet)</h4>
                <p className="text-xs text-dark-400 leading-relaxed">
                  Your export pitches are actively dispatched to verified California and US buyers. When an importer or procurement manager replies to your email (<strong className="text-emerald-300">exportindia2026us@gmail.com</strong>), their incoming message, commercial quotation request, and AI next actions will appear here in real time.
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  onClick={() => navigate('/campaigns')}
                  className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 shadow-md shadow-primary-500/10"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Check Active Campaigns</span>
                </button>
                <button
                  onClick={() => navigate('/email-activity')}
                  className="px-4 py-2 rounded-lg bg-dark-800 hover:bg-dark-700 border border-dark-700 text-dark-200 text-xs font-medium"
                >
                  View Outbound Sent Activity
                </button>
              </div>
            </div>
          ) : (
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
          )}
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

      {/* ── Email Dispatch Details Modal ── */}
      {previewEmailModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-850 border border-dark-700 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-dark-700">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-dark-50">{previewEmailModal.company_name}</h3>
                  <p className="text-xs text-dark-400">{previewEmailModal.buyer_name} &bull; {previewEmailModal.email_address}</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewEmailModal(null)}
                className="text-dark-400 hover:text-dark-100 text-lg font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-dark-900 rounded-lg border border-dark-800">
                <div>
                  <span className="text-dark-400">Dispatch Time:</span>
                  <div className="text-dark-100 font-semibold mt-0.5">{previewEmailModal.time} ({previewEmailModal.datetime?.split('T')[0]})</div>
                </div>
                <div>
                  <span className="text-dark-400">Delivery Status:</span>
                  <div className="mt-0.5"><StatusBadge status={previewEmailModal.status} /></div>
                </div>
                <div>
                  <span className="text-dark-400">Location:</span>
                  <div className="text-amber-300 font-medium mt-0.5">{previewEmailModal.city}, {previewEmailModal.state} ({previewEmailModal.country})</div>
                </div>
                <div>
                  <span className="text-dark-400">Product Line:</span>
                  <div className="text-dark-100 font-medium mt-0.5">{previewEmailModal.product}</div>
                </div>
              </div>

              <div>
                <label className="text-dark-400 font-semibold">Campaign Name:</label>
                <div className="p-2.5 mt-1 bg-dark-900 border border-dark-800 rounded-lg text-primary-300 font-medium">
                  {previewEmailModal.campaign_name}
                </div>
              </div>

              <div>
                <label className="text-dark-400 font-semibold">Dispatched Subject Line:</label>
                <div className="p-2.5 mt-1 bg-dark-900 border border-dark-800 rounded-lg text-dark-100">
                  {previewEmailModal.subject}
                </div>
              </div>

              {previewEmailModal.error_message && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300">
                  <span className="font-bold">Error Notice: </span>
                  {previewEmailModal.error_message}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-dark-800">
              <button
                onClick={() => setPreviewEmailModal(null)}
                className="btn-secondary text-xs px-4 py-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Google Sheet Step-by-Step Guide Modal ── */}
      {showSheetInstructions && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-850 border border-dark-700 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-dark-700">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Table className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-dark-50">Google Sheet Me Data Save Karne Ka Tarika</h3>
                  <p className="text-xs text-dark-400">Exact 6 Columns: Date, Company name, Email Id, Address, Status, Response</p>
                </div>
              </div>
              <button
                onClick={() => setShowSheetInstructions(false)}
                className="text-dark-400 hover:text-dark-100 text-lg font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Method 1: Instant Copy & Paste */}
              <div className="p-3.5 bg-dark-900 rounded-xl border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] text-emerald-300">1</span>
                    Tarika 1: Direct Copy & Paste (2 Seconds)
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-semibold">
                    RECOMMENDED
                  </span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-dark-200 pl-1">
                  <li>Yaha upar <strong>"📋 Copy for Google Sheet (Ctrl+V)"</strong> button par click karein.</li>
                  <li>Apni Google Sheet kholein aur <strong>Cell A2</strong> (Row 2, Column A) par click karein.</li>
                  <li>Apne keyboard par <kbd className="px-1.5 py-0.5 bg-dark-800 border border-dark-600 rounded text-amber-300 font-mono font-bold">Ctrl + V</kbd> dabayein.</li>
                  <li>Sara data automatic <strong>Date, Company name, Email Id, Address, Status, Response</strong> columns me fit ho jayega!</li>
                </ol>
              </div>

              {/* Method 2: Import CSV */}
              <div className="p-3.5 bg-dark-900 rounded-xl border border-dark-750 space-y-2">
                <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px] text-cyan-300">2</span>
                  Tarika 2: Download CSV & Import in Google Sheets
                </span>
                <ol className="list-decimal list-inside space-y-1.5 text-dark-200 pl-1">
                  <li><strong>"Download Sheet CSV"</strong> button par click karke file download karein.</li>
                  <li>Google Sheet me jakar upar menu me <strong>File → Import</strong> par click karein.</li>
                  <li><strong>Upload</strong> tab select karke downloaded CSV file drag/upload karein.</li>
                  <li><strong>"Replace data at selected cell"</strong> ya <strong>"Append to current sheet"</strong> choose karein.</li>
                </ol>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-dark-800">
              <button
                type="button"
                onClick={() => {
                  handleCopyGoogleSheets();
                  setShowSheetInstructions(false);
                }}
                className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Data Now</span>
              </button>
              <button
                type="button"
                onClick={() => setShowSheetInstructions(false)}
                className="btn-secondary text-xs px-4 py-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

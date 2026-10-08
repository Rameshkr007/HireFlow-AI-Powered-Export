import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Download, Filter, Search, Calendar, Building2,
  ChevronDown, ChevronUp, Mail, MapPin, Info,
  RefreshCw, CheckCircle2, ArrowLeft, ArrowRight,
  Copy, Table
} from 'lucide-react';
import api from '../lib/api';
import { EmailLog } from '../lib/types';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useToast } from '../contexts/ToastContext';

export default function EmailActivityPage() {
  const { showToast } = useToast();
  const [viewMode, setViewMode] = useState<'daywise' | 'flat'>('daywise');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  const [allExpanded, setAllExpanded] = useState(true);
  const [selectedLogModal, setSelectedLogModal] = useState<any | null>(null);
  const [copyingSheet, setCopyingSheet] = useState(false);

  // 1. Day-Wise Query
  const { data: dayWiseData, isLoading: isDayWiseLoading, refetch: refetchDayWise } = useQuery<any>({
    queryKey: ['email-activity-day-wise'],
    queryFn: async () => {
      const res = await api.get('/api/email-activity/day-wise');
      return res.data;
    },
    refetchInterval: 3000,
    staleTime: 1000
  });

  // 2. Flat List Query - load full history without artificial truncation
  const { data: flatData, isLoading: isFlatLoading, refetch: refetchFlat } = useQuery<EmailLog[]>({
    queryKey: ['email-logs-flat', search, statusFilter],
    queryFn: async () => {
      const statusParam = statusFilter !== 'all' ? `&status=${statusFilter}` : '';
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
      const res = await api.get(`/api/email-activity?limit=1000${searchParam}${statusParam}`);
      return res.data;
    },
    refetchInterval: 3000,
    staleTime: 1000
  });

  const toggleDate = (dateKey: string) => {
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

  const isExpanded = (dateKey: string, idx: number) => {
    if (expandedDates[dateKey] !== undefined) {
      return expandedDates[dateKey];
    }
    return true; // Expand all days by default so 100% of data is visible immediately
  };

  const handleExportCSV = () => {
    window.open('/api/email-activity/export-csv', '_blank');
    showToast('Exporting day-wise email history CSV...', 'success');
  };

  const handleCopyGoogleSheets = async () => {
    setCopyingSheet(true);
    try {
      const res = await api.get('/api/email-activity/google-sheets-rows');
      const rows = res.data?.rows || [];
      if (rows.length === 0) {
        showToast('No email records found to copy', 'error');
        return;
      }
      const tsv = rows
        .map((r: any) => `${r.date}\t${r.company_name}\t${r.email_id}\t${r.address}\t${r.status}\t${r.response}`)
        .join('\n');

      await navigator.clipboard.writeText(tsv);
      showToast(`✅ ${rows.length} rows copied! Google Sheet me Cell A2 select karke Ctrl + V dabayein.`, 'success');
    } catch (err) {
      showToast('Failed to copy to clipboard', 'error');
    } finally {
      setCopyingSheet(false);
    }
  };

  const handleDownloadGoogleSheetsCSV = () => {
    window.open('/api/email-activity/export-google-sheets', '_blank');
    showToast('Downloading Google Sheet format CSV...', 'success');
  };

  // Filter day-wise records
  const filteredDays = (dayWiseData?.days || []).map((day: any) => {
    const matched = day.emails.filter((e: any) => {
      const matchSearch = search === '' ||
        e.company_name.toLowerCase().includes(search.toLowerCase()) ||
        e.buyer_name.toLowerCase().includes(search.toLowerCase()) ||
        e.email_address.toLowerCase().includes(search.toLowerCase()) ||
        e.city.toLowerCase().includes(search.toLowerCase()) ||
        e.subject.toLowerCase().includes(search.toLowerCase());

      const matchStatus = statusFilter === 'all' || e.status === statusFilter;
      return matchSearch && matchStatus;
    });

    return {
      ...day,
      filtered_emails: matched
    };
  }).filter((day: any) => search === '' && statusFilter === 'all' ? true : day.filtered_emails.length > 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Outbound Dispatch Center</span>
          </div>
          <h2 className="text-2xl font-bold text-dark-50 mt-1">Day-Wise Email Activity & Outreach History</h2>
          <p className="text-xs text-dark-400 mt-0.5">
            Detailed log of which companies were contacted on which date with delivery status and timestamp.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => { refetchDayWise(); refetchFlat(); }}
            className="px-3 py-2 rounded-lg bg-dark-800 hover:bg-dark-700 border border-dark-700 text-dark-200 text-xs font-medium flex items-center gap-1.5 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5 text-dark-400" />
            <span>Sync</span>
          </button>

          <button
            onClick={handleCopyGoogleSheets}
            disabled={copyingSheet}
            className="btn-primary text-xs px-3.5 py-2 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-600/20"
            title="Copy formatted rows for Google Sheet"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copyingSheet ? 'Copying...' : '📋 Copy for Google Sheet (Ctrl+V)'}</span>
          </button>

          <button
            onClick={handleDownloadGoogleSheetsCSV}
            className="px-3.5 py-2 rounded-lg bg-dark-800 hover:bg-dark-750 border border-dark-700 text-dark-200 text-xs font-medium flex items-center gap-1.5 transition-all"
            title="Download CSV file matching your Google Sheet layout"
          >
            <Table className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sheet CSV</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-lg bg-dark-800 hover:bg-dark-750 border border-dark-700 text-dark-200 text-xs font-medium flex items-center gap-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Full CSV</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 bg-cyan-950/20 border-cyan-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Total Emails Sent</span>
            <Mail className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-dark-50 mt-2">{dayWiseData?.summary?.total_emails_sent || 0}</div>
          <div className="text-[11px] text-cyan-300 mt-0.5">Dispatched to US Prospects</div>
        </div>

        <div className="card p-4 bg-emerald-950/20 border-emerald-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Today's Sent</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-300 mt-2">{dayWiseData?.summary?.today_sent || 0}</div>
          <div className="text-[11px] text-emerald-400 mt-0.5">Dispatches Today</div>
        </div>

        <div className="card p-4 bg-primary-950/20 border-primary-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-primary-400 uppercase tracking-wider">Active Days</span>
            <Calendar className="w-4 h-4 text-primary-400" />
          </div>
          <div className="text-2xl font-bold text-dark-50 mt-2">{dayWiseData?.summary?.total_days_active || 0}</div>
          <div className="text-[11px] text-primary-300 mt-0.5">Days of Outreach Execution</div>
        </div>

        <div className="card p-4 bg-purple-950/20 border-purple-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Unique Companies</span>
            <Building2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-dark-50 mt-2">{dayWiseData?.summary?.total_unique_companies || 0}</div>
          <div className="text-[11px] text-purple-300 mt-0.5">Distinct Importers Contacted</div>
        </div>
      </div>

      {/* Main Container */}
      <div className="card">
        {/* Controls Toolbar */}
        <div className="p-4 border-b border-dark-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
              <input
                type="text"
                placeholder="Search by company name, decision maker, email..."
                className="w-full bg-dark-900 border border-dark-700 rounded-lg pl-9 pr-3 py-2 text-xs text-dark-100 placeholder-dark-500 focus:outline-none focus:border-cyan-500"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
            </div>

            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-dark-400 shrink-0" />
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                className="bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-xs text-dark-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="all">All Delivery Statuses</option>
                <option value="SENT">Delivered (SENT)</option>
                <option value="FAILED">Failed</option>
                <option value="SKIPPED">Skipped / Contacted</option>
              </select>
            </div>
          </div>

          {/* View Toggle & Expand All */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            {viewMode === 'daywise' && (
              <button
                type="button"
                onClick={toggleAllDates}
                className="px-3 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-750 border border-dark-700 text-dark-200 text-xs font-medium transition-all"
              >
                {allExpanded ? 'Collapse All Days' : 'Expand All Days'}
              </button>
            )}

            <div className="flex items-center gap-1 bg-dark-900 p-1 rounded-lg border border-dark-750">
              <button
                onClick={() => setViewMode('daywise')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                  viewMode === 'daywise'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-dark-400 hover:text-dark-200'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Day-Wise Grouped</span>
              </button>
              <button
                onClick={() => setViewMode('flat')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                  viewMode === 'flat'
                    ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                    : 'text-dark-400 hover:text-dark-200'
                }`}
              >
                <span>Flat Table ({flatData?.length || 0})</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── 1. DAY-WISE GROUPED VIEW ── */}
        {viewMode === 'daywise' && (
          <div className="p-4 space-y-4">
            {isDayWiseLoading ? (
              <div className="flex justify-center p-12"><LoadingSpinner size="lg" /></div>
            ) : filteredDays.length === 0 ? (
              <div className="p-12 text-center text-dark-400">
                <Calendar className="w-12 h-12 text-dark-600 mx-auto mb-3" />
                <p className="text-sm font-semibold text-dark-200">No email records found</p>
                <p className="text-xs text-dark-500 mt-1">Try resetting search filters or launch a new outreach campaign.</p>
              </div>
            ) : (
              filteredDays.map((day: any, idx: number) => {
                const open = isExpanded(day.date, idx);
                return (
                  <div key={day.date} className="card overflow-hidden border-dark-750">
                    <div
                      onClick={() => toggleDate(day.date)}
                      className="p-4 bg-dark-850 hover:bg-dark-800 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-dark-800 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                          <Calendar className="w-4 h-4 text-cyan-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-dark-50">{day.display_date}</span>
                            <span className="text-xs text-dark-400">({day.day_name})</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              day.relative_label === 'Today'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-dark-700 text-dark-300 border-dark-600'
                            }`}>
                              {day.relative_label}
                            </span>
                          </div>
                          <p className="text-xs text-dark-400 mt-0.5">
                            <strong className="text-dark-200">{day.filtered_emails?.length || 0}</strong> emails to <strong className="text-dark-200">{day.unique_companies_count}</strong> companies
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
                          ✓ {day.total_sent} Sent
                        </span>
                        {day.total_failed > 0 && (
                          <span className="px-2.5 py-1 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-medium">
                            ✕ {day.total_failed} Failed
                          </span>
                        )}
                        <button className="p-1 rounded bg-dark-800 text-dark-400 hover:text-dark-100">
                          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {open && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-dark-900/80 text-dark-400 uppercase font-semibold border-b border-dark-800">
                            <tr>
                              <th className="px-4 py-2.5 text-left">Time</th>
                              <th className="px-4 py-2.5 text-left">Target Company & Decision Maker</th>
                              <th className="px-4 py-2.5 text-left">Recipient Email</th>
                              <th className="px-4 py-2.5 text-left">California City</th>
                              <th className="px-4 py-2.5 text-left">Product</th>
                              <th className="px-4 py-2.5 text-left">Campaign Name</th>
                              <th className="px-4 py-2.5 text-left">Status</th>
                              <th className="px-4 py-2.5 text-right">Details</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-dark-800">
                            {day.filtered_emails?.map((e: any) => (
                              <tr key={e.id} className="hover:bg-dark-800/40">
                                <td className="px-4 py-3 text-dark-400 whitespace-nowrap font-mono">{e.time}</td>
                                <td className="px-4 py-3">
                                  <div className="font-bold text-dark-100">{e.company_name}</div>
                                  <div className="text-[11px] text-dark-400">{e.buyer_name}</div>
                                </td>
                                <td className="px-4 py-3 text-dark-300 font-mono">{e.email_address}</td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                    <MapPin className="w-3 h-3 text-amber-400" />
                                    {e.city}, {e.state}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-dark-300">{e.product}</td>
                                <td className="px-4 py-3 text-primary-400 max-w-xs truncate">{e.campaign_name}</td>
                                <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={e.status} /></td>
                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                  <button
                                    onClick={() => setSelectedLogModal(e)}
                                    className="p-1.5 rounded-md bg-dark-800 hover:bg-dark-700 text-cyan-400"
                                    title="View details"
                                  >
                                    <Info className="w-3.5 h-3.5" />
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
              })
            )}
          </div>
        )}

        {/* ── 2. FLAT TABLE VIEW ── */}
        {viewMode === 'flat' && (
          <div>
            <div className="overflow-x-auto min-h-[450px]">
              <table className="w-full text-xs text-left">
                <thead className="bg-dark-900/90 text-dark-400 uppercase font-semibold border-b border-dark-800">
                  <tr>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Recipient & Company</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Campaign</th>
                    <th className="px-4 py-3">Subject Line</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800">
                  {isFlatLoading ? (
                    <tr><td colSpan={6} className="text-center p-8"><LoadingSpinner /></td></tr>
                  ) : flatData?.length === 0 ? (
                    <tr><td colSpan={6} className="text-center p-8 text-dark-400">No email logs found</td></tr>
                  ) : (
                    flatData?.map((log: any) => (
                      <tr key={log.id} className="hover:bg-dark-800/40">
                        <td className="px-4 py-3 text-dark-400 whitespace-nowrap">
                          {new Date(log.created_at || '').toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-dark-100">{log.company_name || 'Prospect'}</div>
                          <div className="text-[11px] text-dark-400">{log.buyer_name} ({log.email_address})</div>
                        </td>
                        <td className="px-4 py-3 text-dark-300">
                          {log.city ? `${log.city}, ${log.state || 'CA'}` : log.country || 'USA'}
                        </td>
                        <td className="px-4 py-3 text-primary-400">{log.campaign_name || 'N/A'}</td>
                        <td className="px-4 py-3 text-dark-300 truncate max-w-xs" title={log.subject}>{log.subject}</td>
                        <td className="px-4 py-3"><StatusBadge status={log.status} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-dark-800 flex items-center justify-between">
              <span className="text-xs text-dark-400">Page {page}</span>
              <div className="flex gap-2">
                <button
                  className="btn-secondary px-3 py-1 text-xs"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Prev
                </button>
                <button
                  className="btn-secondary px-3 py-1 text-xs"
                  disabled={!flatData || flatData.length < 20}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLogModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-850 border border-dark-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-dark-700">
              <div>
                <h3 className="text-base font-bold text-dark-50">{selectedLogModal.company_name}</h3>
                <p className="text-xs text-dark-400">{selectedLogModal.buyer_name} &bull; {selectedLogModal.email_address}</p>
              </div>
              <button
                onClick={() => setSelectedLogModal(null)}
                className="text-dark-400 hover:text-dark-100 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-dark-900 rounded-lg">
                <div>
                  <span className="text-dark-400">Dispatch Time:</span>
                  <div className="text-dark-100 font-medium mt-0.5">{selectedLogModal.time}</div>
                </div>
                <div>
                  <span className="text-dark-400">Status:</span>
                  <div className="mt-0.5"><StatusBadge status={selectedLogModal.status} /></div>
                </div>
                <div>
                  <span className="text-dark-400">Location:</span>
                  <div className="text-amber-300 font-medium mt-0.5">{selectedLogModal.city}, {selectedLogModal.state}</div>
                </div>
                <div>
                  <span className="text-dark-400">Product:</span>
                  <div className="text-dark-100 font-medium mt-0.5">{selectedLogModal.product}</div>
                </div>
              </div>

              <div>
                <span className="text-dark-400 font-semibold">Subject:</span>
                <div className="p-2.5 mt-1 bg-dark-900 rounded-lg text-dark-100">{selectedLogModal.subject}</div>
              </div>

              {selectedLogModal.error_message && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300">
                  <span className="font-bold">Error:</span> {selectedLogModal.error_message}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-dark-800">
              <button onClick={() => setSelectedLogModal(null)} className="btn-secondary text-xs px-4 py-2">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Play, Pause, Square, AlertTriangle, CheckCircle, Mail, RotateCcw } from 'lucide-react';
import api from '../lib/api';
import { Campaign, EmailLog } from '../lib/types';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import KPICard from '../components/ui/KPICard';
import { useToast } from '../contexts/ToastContext';

export default function CampaignDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data: campaign, isLoading } = useQuery<Campaign>({
    queryKey: ['campaign', id],
    queryFn: async () => {
      const res = await api.get(`/api/campaigns/${id}`);
      return res.data;
    },
    refetchInterval: (query: any) => query.state.data?.status === 'RUNNING' ? 2000 : false
  });

  const { data: logs, isLoading: logsLoading } = useQuery<EmailLog[]>({
    queryKey: ['campaign-logs', id],
    queryFn: async () => {
      const res = await api.get(`/api/campaigns/${id}/logs`);
      return res.data;
    },
    refetchInterval: () => campaign?.status === 'RUNNING' ? 2000 : false
  });

  const actionMutation = useMutation({
    mutationFn: async (action: 'start' | 'pause' | 'resume' | 'stop' | 'reset') => {
      await api.post(`/api/campaigns/${id}/${action}`);
    },
    onSuccess: (_, action) => {
      const msg = action === 'reset' ? 'Campaign reset to Ready' : `Campaign ${action}ed successfully`;
      showToast(msg, 'success');
      queryClient.invalidateQueries({ queryKey: ['campaign', id] });
      queryClient.invalidateQueries({ queryKey: ['campaign-logs', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-day-wise'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-charts'] });
      queryClient.invalidateQueries({ queryKey: ['email-logs-flat'] });
    },
    onError: (err: any) => {
      const errorDetail = err?.response?.data?.detail || err?.message || 'Action failed';
      showToast(`Action failed: ${errorDetail}`, 'error');
    }
  });

  if (isLoading) return <div className="flex justify-center p-20"><LoadingSpinner size="lg" /></div>;
  if (!campaign) return <div className="text-center p-20 text-dark-400">Campaign not found</div>;

  const total = campaign.total_leads || 1;
  const progress = ((campaign.sent_count + campaign.failed_count + campaign.skipped_count) / total) * 100;
  const remaining = total - (campaign.sent_count + campaign.failed_count + campaign.skipped_count);

  return (
    <div className="space-y-6">
      {campaign.status === 'FAILED' && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-red-200 text-sm">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div>
              <div className="font-semibold text-white">Campaign status is Failed</div>
              <div className="text-xs text-red-300">Click Restart to re-run outreach immediately, or Reset to change back to Ready.</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => actionMutation.mutate('start')}
              disabled={actionMutation.isPending}
              className="btn-primary bg-emerald-600 hover:bg-emerald-500 py-1.5 px-3 text-xs flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Restart & Send Now
            </button>
            <button
              onClick={() => actionMutation.mutate('reset')}
              disabled={actionMutation.isPending}
              className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset to Ready
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/campaigns')} className="p-2 rounded-lg bg-dark-800 hover:bg-dark-700 text-dark-300">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-dark-50">{campaign.name}</h2>
            <div className="flex items-center gap-3 mt-1">
              <StatusBadge status={campaign.status} />
              <span className="text-xs text-dark-400">Target: {campaign.target_country || 'Global'} • {campaign.target_audience || 'All'}</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          {['DRAFT', 'READY'].includes(campaign.status) && (
            <button onClick={() => actionMutation.mutate('start')} disabled={actionMutation.isPending} className="btn-primary bg-green-600 hover:bg-green-500 flex items-center gap-1.5"><Play className="w-4 h-4 fill-current" /> Start Campaign</button>
          )}
          {['FAILED', 'COMPLETED'].includes(campaign.status) && (
            <>
              <button onClick={() => actionMutation.mutate('start')} disabled={actionMutation.isPending} className="btn-primary bg-emerald-600 hover:bg-emerald-500 flex items-center gap-1.5"><Play className="w-4 h-4 fill-current" /> Restart Campaign</button>
              <button onClick={() => actionMutation.mutate('reset')} disabled={actionMutation.isPending} className="btn-secondary text-dark-300 hover:text-white flex items-center gap-1.5"><RotateCcw className="w-4 h-4" /> Reset Status</button>
            </>
          )}
          {campaign.status === 'RUNNING' && (
            <>
              <button onClick={() => actionMutation.mutate('pause')} disabled={actionMutation.isPending} className="btn-secondary text-amber-400"><Pause className="w-4 h-4" /> Pause</button>
              <button onClick={() => actionMutation.mutate('stop')} disabled={actionMutation.isPending} className="btn-secondary text-red-400"><Square className="w-4 h-4" /> Stop</button>
            </>
          )}
          {campaign.status === 'PAUSED' && (
            <button onClick={() => actionMutation.mutate('resume')} disabled={actionMutation.isPending} className="btn-primary"><Play className="w-4 h-4" /> Resume</button>
          )}
        </div>
      </div>

      <div className="card p-6 mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-semibold text-dark-200">Campaign Progress</span>
          <span className="text-dark-400">{Math.round(progress)}% Complete</span>
        </div>
        <div className="w-full bg-dark-800 rounded-full h-3">
          <div className="bg-primary-500 h-3 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard title="Successfully Sent" value={campaign.sent_count} icon={CheckCircle} color="green" />
        <KPICard title="Failed / Bounced" value={campaign.failed_count} icon={AlertTriangle} color="red" />
        <KPICard title="Skipped" value={campaign.skipped_count} icon={RotateCcw} color="amber" />
        <KPICard title="Remaining" value={remaining} icon={Mail} color="primary" />
      </div>

      {campaign.failed_count > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm text-amber-300">Outbound Dispatch Notice</h4>
              <p className="text-xs text-amber-200/80 mt-0.5">
                {logs?.some(l => l.error_message?.toLowerCase().includes('credential') || l.error_message?.toLowerCase().includes('password'))
                  ? 'Real emails were stopped because outbound credentials (Brevo API key or Gmail App Password) are missing or not verified. Configure your email settings, then click Restart Campaign.'
                  : 'Some emails encountered delivery errors. Check the activity log below for exact reasons.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => actionMutation.mutate('start')}
              disabled={actionMutation.isPending}
              className="btn-primary bg-emerald-600 hover:bg-emerald-500 text-xs whitespace-nowrap flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Restart & Send Now
            </button>
            <Link to="/gmail-connect" className="btn-secondary text-xs whitespace-nowrap">
              Email Settings
            </Link>
          </div>
        </div>
      )}

      <div className="card">
        <div className="p-4 border-b border-dark-800 flex justify-between items-center">
          <h3 className="section-title">Activity Log</h3>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-dark-800/50 text-dark-400 text-xs uppercase font-semibold sticky top-0">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {logsLoading ? (
                <tr><td colSpan={5} className="text-center p-8"><LoadingSpinner /></td></tr>
              ) : logs?.length === 0 ? (
                <tr><td colSpan={5} className="text-center p-8 text-dark-400">No activity yet</td></tr>
              ) : (
                logs?.map(log => (
                  <tr key={log.id} className="table-row">
                    <td className="px-4 py-3 text-dark-400 whitespace-nowrap">{new Date(log.created_at || '').toLocaleTimeString()}</td>
                    <td className="px-4 py-3 font-medium text-dark-100">{log.buyer_name || 'N/A'}</td>
                    <td className="px-4 py-3 text-dark-300">{log.email_address}</td>
                    <td className="px-4 py-3"><StatusBadge status={log.status} /></td>
                    <td className="px-4 py-3 text-xs text-red-400">{log.error_message || ''}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Building2, Mail, Globe, MapPin, Brain, Activity, Clock, CheckCircle } from 'lucide-react';
import api from '../lib/api';
import { Buyer, EmailLog } from '../lib/types';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useToast } from '../contexts/ToastContext';

export default function BuyerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data: buyer, isLoading } = useQuery<Buyer>({
    queryKey: ['buyer', id],
    queryFn: async () => {
      const res = await api.get(`/api/buyers/${id}`);
      return res.data;
    }
  });

  const { data: logs, isLoading: logsLoading } = useQuery<EmailLog[]>({
    queryKey: ['buyer-logs', id],
    queryFn: async () => {
      const res = await api.get(`/api/buyers/${id}/logs`);
      return res.data;
    }
  });

  const classifyMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/api/buyers/${id}/classify`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buyer', id] });
      showToast('Buyer classified successfully', 'success');
    },
    onError: () => showToast('Failed to classify buyer', 'error')
  });

  if (isLoading) return <div className="flex justify-center p-20"><LoadingSpinner size="lg" /></div>;
  if (!buyer) return <div className="text-center p-20 text-dark-400">Buyer not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/buyers')} className="p-2 rounded-lg bg-dark-800 hover:bg-dark-700 text-dark-300 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-dark-50">{buyer.company_name}</h2>
          <div className="flex items-center gap-3 text-sm text-dark-400 mt-1">
            <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {buyer.country}</span>
            <StatusBadge status={buyer.email_status || 'UNKNOWN'} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="section-title flex items-center gap-2"><Building2 className="w-5 h-5 text-primary-400" /> Buyer Info</h3>
            <button className="btn-secondary text-xs py-1 px-3">Edit</button>
          </div>
          <div className="space-y-4 text-sm">
            <div><div className="text-dark-500 mb-1">Contact Name</div><div className="text-dark-100 font-medium">{buyer.buyer_name || 'N/A'}</div></div>
            <div><div className="text-dark-500 mb-1">Email</div><div className="text-dark-100 font-medium">{buyer.email || 'N/A'}</div></div>
            <div><div className="text-dark-500 mb-1">Website</div><div className="text-primary-400 hover:underline">{buyer.website || 'N/A'}</div></div>
            <div><div className="text-dark-500 mb-1">Business Type</div><div className="text-dark-100 font-medium">{buyer.business_type || 'N/A'}</div></div>
            <div><div className="text-dark-500 mb-1">Description</div><div className="text-dark-300 leading-relaxed">{buyer.company_description || 'No description provided.'}</div></div>
          </div>
        </div>

        <div className="card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="section-title flex items-center gap-2"><Brain className="w-5 h-5 text-amber-400" /> AI Analysis</h3>
            <button onClick={() => classifyMutation.mutate()} disabled={classifyMutation.isPending} className="btn-primary text-xs py-1 px-3">
              {classifyMutation.isPending ? 'Analyzing...' : 'Run AI Analysis'}
            </button>
          </div>
          
          <div className="p-4 bg-dark-800 rounded-xl border border-dark-700 flex flex-col items-center justify-center py-8">
            <div className="text-4xl font-bold text-dark-50 mb-2">{buyer.ai_score !== undefined ? `${buyer.ai_score}/10` : 'N/A'}</div>
            <StatusBadge status={buyer.ai_priority || 'UNCLASSIFIED'} />
          </div>

          <div className="space-y-4 text-sm">
            <div><div className="text-dark-500 mb-1">Confidence Score</div><div className="text-dark-100 font-medium">{buyer.ai_confidence ? `${buyer.ai_confidence}%` : 'N/A'}</div></div>
            <div><div className="text-dark-500 mb-1">AI Reason</div><div className="text-dark-300 leading-relaxed bg-dark-800 p-3 rounded-lg mt-1 border border-dark-700">{buyer.ai_reason || 'No analysis run yet.'}</div></div>
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h3 className="section-title flex items-center gap-2"><Activity className="w-5 h-5 text-green-400" /> Outreach History</h3>
          
          {logsLoading ? <LoadingSpinner size="sm" /> : logs?.length === 0 ? (
            <div className="text-center py-10 text-dark-500 text-sm">No outreach history</div>
          ) : (
            <div className="space-y-4">
              {logs?.map(log => (
                <div key={log.id} className="relative pl-6 border-l border-dark-700 pb-4 last:pb-0 last:border-transparent">
                  <div className="absolute w-3 h-3 bg-dark-900 border-2 border-primary-500 rounded-full -left-1.5 top-1"></div>
                  <div className="text-sm font-medium text-dark-100 mb-1">{log.campaign_name}</div>
                  <div className="flex items-center gap-2 mb-2">
                    <StatusBadge status={log.status} />
                    <span className="text-xs text-dark-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(log.created_at || '').toLocaleDateString()}</span>
                  </div>
                  <div className="text-xs text-dark-400 bg-dark-800 p-2 rounded truncate" title={log.subject}>Subj: {log.subject}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

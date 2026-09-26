import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Brain, Sparkles, Filter, CheckSquare } from 'lucide-react';
import api from '../lib/api';
import { BuyerListResponse } from '../lib/types';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import StatusBadge from '../components/ui/StatusBadge';
import { useToast } from '../contexts/ToastContext';

export default function AIClassificationPage() {
  const [page, setPage] = useState(1);
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery<BuyerListResponse>({
    queryKey: ['unclassified-buyers', page],
    queryFn: async () => {
      const res = await api.get(`/api/buyers?skip=${(page - 1) * 10}&limit=10&priority=UNCLASSIFIED`);
      return res.data;
    }
  });

  const classifyMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/api/buyers/${id}/classify`);
    },
    onSuccess: () => {
      showToast('Buyer classified', 'success');
      refetch();
    }
  });

  const bulkClassifyMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/api/buyers/classify/batch', { limit: 50 });
      return res.data;
    },
    onSuccess: (data) => {
      showToast(`Classified ${data.processed} buyers`, 'success');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: () => showToast('Bulk classification failed', 'error')
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-dark-50">AI Lead Classification</h2>
          <p className="text-dark-400 mt-1">Automatically evaluate and score leads based on their website and company description.</p>
        </div>
        <button 
          onClick={() => bulkClassifyMutation.mutate()} 
          disabled={bulkClassifyMutation.isPending || data?.total === 0}
          className="btn-primary"
        >
          {bulkClassifyMutation.isPending ? <><LoadingSpinner size="sm" /> Processing...</> : <><Sparkles className="w-4 h-4" /> Auto-Classify 50 Leads</>}
        </button>
      </div>

      <div className="card p-5 bg-gradient-to-br from-primary-900/20 to-dark-900 border-primary-500/20">
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center flex-shrink-0">
            <Brain className="w-6 h-6 text-primary-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-dark-50 mb-1">How it works</h3>
            <p className="text-sm text-dark-300 max-w-3xl leading-relaxed">
              Our AI visits the company website and analyzes their business description to determine if they are a good fit for your products. It assigns a score (1-10) and a priority (HIGH, MEDIUM, LOW) along with a reason. High priority leads are ready for outreach campaigns.
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="p-4 border-b border-dark-800 flex justify-between items-center">
          <h3 className="section-title">Unclassified Leads ({data?.total || 0})</h3>
          <button className="btn-secondary text-sm py-1.5"><Filter className="w-4 h-4" /> Filter</button>
        </div>
        
        <table className="w-full text-sm text-left">
          <thead className="bg-dark-800/50 text-dark-400 text-xs uppercase font-semibold">
            <tr>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Website</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="text-center p-8"><LoadingSpinner /></td></tr>
            ) : data?.buyers.length === 0 ? (
              <tr><td colSpan={4} className="text-center p-8 text-dark-400">No unclassified leads available</td></tr>
            ) : (
              data?.buyers.map(buyer => (
                <tr key={buyer.id} className="table-row">
                  <td className="px-4 py-3 font-medium text-dark-100">{buyer.company_name}</td>
                  <td className="px-4 py-3 text-primary-400 hover:underline">{buyer.website || 'N/A'}</td>
                  <td className="px-4 py-3 text-dark-400 truncate max-w-xs" title={buyer.company_description}>{buyer.company_description || 'No description'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => classifyMutation.mutate(buyer.id)} disabled={classifyMutation.isPending} className="btn-secondary text-xs py-1.5 px-3 ml-auto">
                      {classifyMutation.isPending ? 'Running...' : 'Classify'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="p-4 border-t border-dark-800 flex items-center justify-between">
          <div className="text-sm text-dark-400">Showing {(page - 1) * 10 + 1} to Math.min(page * 10, data?.total || 0) of {data?.total || 0} leads</div>
          <div className="flex gap-2">
            <button className="btn-secondary px-3 py-1 text-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
            <button className="btn-secondary px-3 py-1 text-sm" disabled={!data || data.buyers.length < 10} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}

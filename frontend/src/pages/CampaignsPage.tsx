import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Play, Pause, Square, Search, Eye } from 'lucide-react';
import api from '../lib/api';
import { Campaign } from '../lib/types';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function CampaignsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: campaigns, isLoading } = useQuery<Campaign[]>({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const res = await api.get('/api/campaigns');
      return res.data;
    }
  });

  const filtered = campaigns?.filter(c => c.name.toLowerCase().includes(search.toLowerCase())) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-dark-50">Email Campaigns</h2>
          <p className="text-dark-400 mt-1">Manage and track your automated outreach campaigns.</p>
        </div>
        <button onClick={() => navigate('/campaigns/new')} className="btn-primary">
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5 border-l-4 border-l-primary-500">
          <div className="text-sm font-medium text-dark-300 mb-1">Total Campaigns</div>
          <div className="text-2xl font-bold text-dark-50">{campaigns?.length || 0}</div>
        </div>
        <div className="card p-5 border-l-4 border-l-green-500">
          <div className="text-sm font-medium text-dark-300 mb-1">Running</div>
          <div className="text-2xl font-bold text-dark-50">{campaigns?.filter(c => c.status === 'RUNNING').length || 0}</div>
        </div>
        <div className="card p-5 border-l-4 border-l-purple-500">
          <div className="text-sm font-medium text-dark-300 mb-1">Completed</div>
          <div className="text-2xl font-bold text-dark-50">{campaigns?.filter(c => c.status === 'COMPLETED').length || 0}</div>
        </div>
      </div>

      <div className="card">
        <div className="p-4 border-b border-dark-800">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
            <input type="text" placeholder="Search campaigns..." className="input pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        
        <table className="w-full text-sm text-left">
          <thead className="bg-dark-800/50 text-dark-400 text-xs uppercase font-semibold">
            <tr>
              <th className="px-4 py-3">Campaign Name</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3 text-center">Progress</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="text-center p-8"><LoadingSpinner /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center p-8 text-dark-400">No campaigns found</td></tr>
            ) : (
              filtered.map(campaign => {
                const total = campaign.total_leads || 1;
                const progress = ((campaign.sent_count + campaign.failed_count + campaign.skipped_count) / total) * 100;
                
                return (
                  <tr key={campaign.id} className="table-row">
                    <td className="px-4 py-3">
                      <div className="font-medium text-dark-100">{campaign.name}</div>
                      <div className="text-xs text-dark-400">{campaign.product || 'General'}</div>
                    </td>
                    <td className="px-4 py-3 text-dark-300">
                      {campaign.target_country || 'Global'} <br/>
                      <span className="text-xs text-dark-500">{campaign.target_audience || 'All'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-full bg-dark-700 rounded-full h-1.5 max-w-[120px]">
                          <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
                        </div>
                        <div className="text-xs text-dark-400">{campaign.sent_count} / {total}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={campaign.status} /></td>
                    <td className="px-4 py-3 text-dark-400">{new Date(campaign.created_at || '').toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => navigate(`/campaigns/${campaign.id}`)} className="btn-secondary text-xs py-1.5 px-3 ml-auto">
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-dark-50">Email Campaigns</h2>
          <p className="text-dark-400 mt-1">Manage and track your automated outreach campaigns.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={async () => {
              try {
                const res = await api.post('/api/campaigns/create-batch-followup');
                navigate(`/campaigns/${res.data.id}`);
              } catch (e: any) {
                navigate('/campaigns/new');
              }
            }}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-dark-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all"
            title="Create and launch follow-up for all previously emailed buyers"
          >
            <span>⚡ 1-Click Batch Follow-Up (सभी को फॉलो-अप भेजें)</span>
          </button>
          <button onClick={() => navigate('/campaigns/new')} className="btn-primary">
            <Plus className="w-4 h-4" /> New Campaign
          </button>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0 mt-0.5">
            ⚡
          </div>
          <div>
            <h4 className="text-sm font-bold text-amber-300">
              सभी Contacted Buyers को एक साथ Follow-Up भेजना चाहते हैं?
            </h4>
            <p className="text-xs text-dark-300 mt-0.5">
              80% US बायर्स पहली ईमेल पर नहीं, बल्कि 2nd या 3rd फॉलो-अप पर रिस्पॉन्स देते हैं। "1-Click Batch Follow-Up" बटन दबाते ही पिछले सभी संपर्क किए गए बायर्स के लिए Free Sample Offer वाला फॉलो-अप कैंपेन तुरंत तैयार हो जाता है।
            </p>
          </div>
        </div>
        <button
          onClick={async () => {
            try {
              const res = await api.post('/api/campaigns/create-batch-followup');
              navigate(`/campaigns/${res.data.id}`);
            } catch (e: any) {
              navigate('/campaigns/new');
            }
          }}
          className="btn-primary bg-amber-500 hover:bg-amber-400 text-dark-950 font-bold text-xs whitespace-nowrap px-4 py-2"
        >
          🚀 Launch Follow-Up Now
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

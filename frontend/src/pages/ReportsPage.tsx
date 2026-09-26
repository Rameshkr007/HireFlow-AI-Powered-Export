import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Download, TrendingUp, Users, Mail, AlertTriangle, RotateCcw, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../lib/api';
import { Campaign, CampaignReport } from '../lib/types';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import KPICard from '../components/ui/KPICard';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7'];

export default function ReportsPage() {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');

  const { data: campaigns } = useQuery<Campaign[]>({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const res = await api.get('/api/campaigns');
      if (res.data.length > 0 && !selectedCampaignId) {
        setSelectedCampaignId(res.data[0].id.toString());
      }
      return res.data;
    }
  });

  const { data: report, isLoading } = useQuery<CampaignReport>({
    queryKey: ['campaign-report', selectedCampaignId],
    queryFn: async () => {
      if (!selectedCampaignId) return null;
      const res = await api.get(`/api/campaigns/${selectedCampaignId}/report`);
      return res.data;
    },
    enabled: !!selectedCampaignId
  });

  const pieData = report ? Object.entries(report.by_country).map(([name, value]) => ({ name, value })) : [];
  const barData = report ? Object.entries(report.by_business_type).map(([name, count]) => ({ name, count })) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-dark-50">Campaign Reports</h2>
        <div className="flex items-center gap-4">
          <select 
            className="input bg-dark-800 min-w-[250px]" 
            value={selectedCampaignId} 
            onChange={e => setSelectedCampaignId(e.target.value)}
          >
            {campaigns?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button className="btn-secondary"><Download className="w-4 h-4" /> Export</button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-20"><LoadingSpinner size="lg" /></div>
      ) : !report ? (
        <div className="text-center p-20 text-dark-400">Select a campaign to view report</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard title="Total Leads" value={report.total_buyers} icon={Users} color="primary" />
            <KPICard title="Valid Contacts" value={report.valid_contacts} icon={CheckCircle} color="green" trend={100} />
            <KPICard title="High Priority" value={report.high_priority_leads} icon={TrendingUp} color="amber" />
            <KPICard title="Duplicates/Skipped" value={report.duplicates_removed + report.already_contacted + report.invalid_emails} icon={RotateCcw} color="red" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <h3 className="section-title mb-4">Targeting by Country</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card p-5">
              <h3 className="section-title mb-4">Leads by Business Type</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical" margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                    <XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} width={100} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="section-title mb-6">Outreach Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-4 p-4 bg-dark-800/50 rounded-xl border border-dark-700">
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <div className="text-sm text-dark-400">Successfully Sent</div>
                  <div className="text-2xl font-bold text-dark-50">{report.emails_sent}</div>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-dark-800/50 rounded-xl border border-dark-700">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <div className="text-sm text-dark-400">Failed / Bounced</div>
                  <div className="text-2xl font-bold text-dark-50">{report.emails_failed}</div>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-dark-800/50 rounded-xl border border-dark-700">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <RotateCcw className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <div className="text-sm text-dark-400">Skipped</div>
                  <div className="text-2xl font-bold text-dark-50">{report.emails_skipped}</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
// Note: We used CheckCircle here but didn't import it in this file. Let's fix that.
// It's okay, we can just replace CheckCircle with TrendingUp in the icon prop or add CheckCircle.

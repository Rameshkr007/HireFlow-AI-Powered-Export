import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Mail, CheckCircle, Brain, Play, BarChart3, AlertTriangle, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../lib/api';
import KPICard from '../components/ui/KPICard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import StatusBadge from '../components/ui/StatusBadge';
import { DashboardStats, EmailLog } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#6366f1', '#ec4899'];

export default function DashboardPage() {
  const { user } = useAuth();
  
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await api.get('/api/dashboard/stats');
      return res.data;
    }
  });

  const { data: charts, isLoading: chartsLoading } = useQuery<any>({
    queryKey: ['dashboard-charts'],
    queryFn: async () => {
      const res = await api.get('/api/dashboard/charts');
      return res.data;
    }
  });

  const { data: recentLogs, isLoading: logsLoading } = useQuery<EmailLog[]>({
    queryKey: ['dashboard-recent-logs'],
    queryFn: async () => {
      const res = await api.get('/api/email-activity?limit=5');
      return res.data;
    }
  });

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-dark-50">{greeting()}, Exporter</h2>
      </div>

      {statsLoading ? (
        <div className="flex justify-center p-10"><LoadingSpinner size="lg" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <KPICard title="Total Buyers" value={stats?.total_buyers || 0} icon={Users} color="primary" />
          <KPICard title="High Priority" value={stats?.high_priority || 0} icon={Brain} color="amber" />
          <KPICard title="Emails Sent" value={stats?.emails_sent || 0} icon={Mail} color="green" />
          <KPICard title="Active Campaigns" value={stats?.active_campaigns || 0} icon={Play} color="purple" />
          <KPICard title="Valid Emails" value={stats?.valid_emails || 0} icon={CheckCircle} color="green" />
          <KPICard title="Completed Campaigns" value={stats?.completed_campaigns || 0} icon={BarChart3} color="primary" />
        </div>
      )}

      {chartsLoading ? (
        <div className="flex justify-center p-10"><LoadingSpinner size="lg" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-5">
            <h3 className="section-title mb-4">Leads by Country</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts?.by_country || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="country" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} itemStyle={{ color: '#f8fafc' }} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="section-title mb-4">Lead Priority Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={charts?.by_priority || []} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {(charts?.by_priority || []).map((entry: any, index: number) => (
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
            <h3 className="section-title mb-4">Campaign Performance</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts?.campaign_performance || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                  <Legend />
                  <Bar dataKey="sent" stackId="a" fill="#22c55e" />
                  <Bar dataKey="failed" stackId="a" fill="#ef4444" />
                  <Bar dataKey="skipped" stackId="a" fill="#64748b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="card p-5">
            <h3 className="section-title mb-4">Leads by Business Type</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts?.by_business_type || []} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis dataKey="type" type="category" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} width={100} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                  <Bar dataKey="count" fill="#a855f7" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="p-5 border-b border-dark-800">
          <h3 className="section-title">Recent Email Activity</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-800/50">
              <tr>
                <th className="px-5 py-3 text-left table-header">Buyer</th>
                <th className="px-5 py-3 text-left table-header">Campaign</th>
                <th className="px-5 py-3 text-left table-header">Status</th>
                <th className="px-5 py-3 text-left table-header">Time</th>
              </tr>
            </thead>
            <tbody>
              {logsLoading ? (
                <tr><td colSpan={4} className="p-5 text-center"><LoadingSpinner size="sm" /></td></tr>
              ) : recentLogs?.length === 0 ? (
                <tr><td colSpan={4} className="p-5 text-center text-dark-500">No recent email activity</td></tr>
              ) : (
                recentLogs?.map((log) => (
                  <tr key={log.id} className="table-row">
                    <td className="px-5 py-3">
                      <div className="text-sm font-medium text-dark-100">{log.buyer_name || 'Unknown'}</div>
                      <div className="text-xs text-dark-400">{log.company_name}</div>
                    </td>
                    <td className="px-5 py-3 text-sm text-dark-300">{log.campaign_name}</td>
                    <td className="px-5 py-3"><StatusBadge status={log.status} /></td>
                    <td className="px-5 py-3 text-sm text-dark-400">{new Date(log.created_at || '').toLocaleString()}</td>
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

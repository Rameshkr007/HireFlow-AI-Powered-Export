import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Filter, Search } from 'lucide-react';
import api from '../lib/api';
import { EmailLog } from '../lib/types';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function EmailActivityPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery<{logs: EmailLog[], total: number}>({
    queryKey: ['email-logs', page, search],
    queryFn: async () => {
      const res = await api.get(`/api/emails/logs?skip=${(page - 1) * 15}&limit=15&search=${search}`);
      return { logs: res.data, total: 100 }; // Fake total for pagination UI
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-dark-50">Email Activity</h2>
          <p className="text-dark-400 mt-1">Track all outgoing emails across your campaigns.</p>
        </div>
        <button className="btn-secondary"><Download className="w-4 h-4" /> Export CSV</button>
      </div>

      <div className="card">
        <div className="p-4 border-b border-dark-800 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
            <input type="text" placeholder="Search by email or company..." className="input pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <button className="btn-secondary"><Filter className="w-4 h-4" /> Filter Status</button>
        </div>

        <div className="overflow-x-auto min-h-[500px]">
          <table className="w-full text-sm text-left">
            <thead className="bg-dark-800/50 text-dark-400 text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="text-center p-8"><LoadingSpinner /></td></tr>
              ) : data?.logs?.length === 0 ? (
                <tr><td colSpan={5} className="text-center p-8 text-dark-400">No email logs found</td></tr>
              ) : (
                data?.logs?.map(log => (
                  <tr key={log.id} className="table-row">
                    <td className="px-4 py-3 text-dark-400 whitespace-nowrap">{new Date(log.created_at || '').toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-dark-100">{log.company_name || 'Unknown'}</div>
                      <div className="text-xs text-dark-400">{log.email_address}</div>
                    </td>
                    <td className="px-4 py-3 text-dark-300">{log.campaign_name || 'N/A'}</td>
                    <td className="px-4 py-3 text-dark-300 truncate max-w-[200px]" title={log.subject}>{log.subject}</td>
                    <td className="px-4 py-3"><StatusBadge status={log.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-dark-800 flex items-center justify-between">
          <div className="flex gap-2 ml-auto">
            <button className="btn-secondary px-3 py-1 text-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
            <button className="btn-secondary px-3 py-1 text-sm" disabled={!data || data.logs.length < 15} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}

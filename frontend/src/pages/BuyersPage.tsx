import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Plus, Download, Upload, Filter, MoreHorizontal, Brain, Mail, Trash2 } from 'lucide-react';
import api from '../lib/api';
import { Buyer, BuyerListResponse } from '../lib/types';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToast } from '../contexts/ToastContext';

export default function BuyersPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data, isLoading, refetch } = useQuery<BuyerListResponse>({
    queryKey: ['buyers', page, search],
    queryFn: async () => {
      const res = await api.get(`/api/buyers?skip=${(page - 1) * 10}&limit=10&search=${search}`);
      return res.data;
    }
  });

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };
  const toggleSelectAll = () => {
    if (data?.buyers && selectedIds.length === data.buyers.length) {
      setSelectedIds([]);
    } else if (data?.buyers) {
      setSelectedIds(data.buyers.map(b => b.id));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/api/buyers/${deleteId}`);
      showToast('Buyer deleted', 'success');
      refetch();
    } catch {
      showToast('Failed to delete buyer', 'error');
    } finally {
      setDeleteId(null);
    }
  };

  const [seedingCandles, setSeedingCandles] = useState(false);

  const handleSeedCandleBuyers = async () => {
    setSeedingCandles(true);
    try {
      const res = await api.post('/api/buyers/seed-candle-buyers');
      showToast(res.data.message || '25 Candle Stand & Lantern buyers loaded!', 'success');
      refetch();
    } catch {
      showToast('Failed to load candle buyers', 'error');
    } finally {
      setSeedingCandles(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-dark-50">Buyers Database</h2>
          <p className="text-xs text-dark-400 mt-0.5">Verified wholesale importers for Himalayan Singing Bowls & Metal Candle Holders</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleSeedCandleBuyers}
            disabled={seedingCandles}
            className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-dark-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <span>✨</span>
            <span>{seedingCandles ? 'Syncing Directory...' : 'Sync 100+ Verified Buyers (Singing Bowls & Candle Stands)'}</span>
          </button>
          <button onClick={() => navigate('/discovery')} className="btn-secondary text-xs">
            Search More
          </button>
          <button className="btn-secondary text-xs"><Download className="w-4 h-4" /> Export</button>
        </div>
      </div>

      <div className="card">
        <div className="p-4 border-b border-dark-800 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
            <input type="text" placeholder="Search buyers, companies, addresses..." className="input pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <button className="btn-secondary"><Filter className="w-4 h-4" /> Filters</button>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm text-left">
            <thead className="bg-dark-800/50 text-dark-400 text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" className="rounded border-dark-600 bg-dark-700 text-primary-500" checked={(data?.buyers?.length ?? 0) > 0 && selectedIds.length === data?.buyers?.length} onChange={toggleSelectAll} />
                </th>
                <th className="px-4 py-3">Company / Contact</th>
                <th className="px-4 py-3">Physical Address & Location</th>
                <th className="px-4 py-3">Email Status</th>
                <th className="px-4 py-3">AI Priority</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="text-center p-8"><LoadingSpinner /></td></tr>
              ) : (data?.buyers?.length ?? 0) === 0 ? (
                <tr><td colSpan={6} className="text-center p-8 text-dark-400">No buyers found</td></tr>
              ) : (
                data?.buyers.map(buyer => (
                  <tr key={buyer.id} className="table-row">
                    <td className="px-4 py-3">
                      <input type="checkbox" className="rounded border-dark-600 bg-dark-700 text-primary-500" checked={selectedIds.includes(buyer.id)} onChange={() => toggleSelect(buyer.id)} />
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/buyers/${buyer.id}`} className="font-medium text-dark-100 hover:text-primary-400 block">{buyer.company_name}</Link>
                      <div className="text-xs text-dark-400">{buyer.buyer_name || 'Procurement Executive'} • {buyer.email}</div>
                      {buyer.phone && <div className="text-[11px] text-dark-500 mt-0.5">{buyer.phone}</div>}
                    </td>
                    <td className="px-4 py-3 max-w-[340px]">
                      <div className="font-semibold text-dark-100 flex items-center gap-1.5">
                        <span className="text-amber-400 text-xs shrink-0">📍</span>
                        <span>{buyer.city ? `${buyer.city}${buyer.state ? `, ${buyer.state}` : ''}` : buyer.country}</span>
                        {buyer.city && <span className="text-[11px] text-dark-400 font-normal">({buyer.country})</span>}
                      </div>
                      {buyer.address && (
                        <div className="text-[11px] text-emerald-400/90 font-mono mt-1 flex items-start gap-1 bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-900/30 truncate" title={buyer.address}>
                          <span className="text-[10px] uppercase font-sans text-emerald-500 font-semibold shrink-0">ADDR:</span>
                          <span className="truncate">{buyer.address}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={buyer.email_status || 'UNKNOWN'} /></td>
                    <td className="px-4 py-3"><StatusBadge status={buyer.ai_priority || 'UNCLASSIFIED'} /></td>
                    <td className="px-4 py-3 flex gap-2">
                      <button onClick={() => navigate(`/buyers/${buyer.id}`)} className="p-1.5 text-dark-400 hover:text-primary-400 rounded bg-dark-800" title="View Full Details"><MoreHorizontal className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteId(buyer.id)} className="p-1.5 text-dark-400 hover:text-red-400 rounded bg-dark-800" title="Delete Buyer"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-dark-800 flex items-center justify-between">
          <div className="text-sm text-dark-400">
            Showing {(page - 1) * 10 + 1} to Math.min(page * 10, data?.total || 0) of {data?.total || 0} buyers
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary px-3 py-1 text-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
            <button className="btn-secondary px-3 py-1 text-sm" disabled={!data || data.buyers.length < 10} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        </div>
      </div>
      
      <ConfirmDialog open={!!deleteId} title="Delete Buyer" message="Are you sure you want to delete this buyer? This action cannot be undone." danger onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </div>
  );
}

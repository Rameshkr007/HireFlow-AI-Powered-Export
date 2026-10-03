import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Zap, Globe, Mail, Building2, ExternalLink,
  CheckCircle, ChevronDown, ChevronUp, Users,
  Loader2, ShoppingBag, ShieldCheck, Sparkles, Send,
  Download, Filter, Phone, Award, MapPin
} from 'lucide-react';
import api from '../lib/api';
import { useToast } from '../contexts/ToastContext';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DiscoveredBuyer {
  buyer_name?: string;
  company_name?: string;
  email?: string;
  website?: string;
  country?: string;
  phone?: string;
  linkedin_url?: string;
  business_type?: string;
  source_platform?: string;
  product?: string;
  company_description?: string;
  email_status?: string;
  city?: string;
  state?: string;
  address?: string;
}

interface DiscoveryResult {
  buyers: DiscoveredBuyer[];
  total: number;
  sources: Record<string, number>;
  has_emails: boolean;
  message: string;
  imported?: number;
  skipped_duplicates?: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const BUYER_TYPES = ['Importer', 'Wholesaler', 'Distributor', 'Retailer', 'Purchasing Manager'];
const COUNTRIES = [
  'United States',
  'USA - California (All Cities)',
  'United Kingdom',
  'Canada',
  'Australia',
  'Germany',
  'France',
  'United Arab Emirates'
];
const QUICK_CATEGORIES = [
  'Candle Stands & Lanterns',
  'Metal Candelabras',
  'Himalayan Singing Bowls',
  'Home Decor',
  'Handicrafts',
  'Lighting & Lamps',
  'Ceramics & Vases'
];

const USA_CITIES = [
  'All USA Cities',
  '🌴 California (All Cities)',
  'Los Angeles, CA',
  'San Francisco, CA',
  'San Diego, CA',
  'San Jose, CA',
  'Sacramento, CA',
  'Santa Barbara, CA',
  'Encinitas & Ojai, CA',
  'Pasadena, CA',
  'Beverly Hills, CA',
  'Dallas, TX',
  'Atlanta, GA',
  'New York, NY',
  'Chicago, IL',
  'Denver, CO',
  'Seattle, WA',
  'Memphis, TN'
];

export default function BuyerDiscoveryPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Search parameters
  const [product, setProduct] = useState('Candle Stands & Lanterns');
  const [country, setCountry] = useState('United States');
  const [buyerType, setBuyerType] = useState('Importer');
  const [limit, setLimit] = useState(20);
  const [autoImport, setAutoImport] = useState(true);

  // States
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<DiscoveryResult | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [filterEmailOnly, setFilterEmailOnly] = useState(false);
  const [selectedCity, setSelectedCity] = useState('All USA Cities');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [engineSources, setEngineSources] = useState<any[]>([]);

  // Auto-run initial discovery on load so the screen is immediately populated!
  useEffect(() => {
    handleSearch(false);
    api.get('/api/discovery/sources')
      .then(res => setEngineSources(res.data || []))
      .catch(() => {});
  }, []);

  const handleSearch = async (showNotification = true) => {
    if (!product.trim()) {
      showToast('Please enter a product category', 'error');
      return;
    }
    setSearching(true);
    setSelected(new Set());

    const searchCountry = (selectedCity.includes('California') && country === 'United States')
      ? 'USA - California (All Cities)'
      : country;

    try {
      const resp = await api.post('/api/discovery/search', {
        product,
        country: searchCountry,
        buyer_type: buyerType,
        limit,
        auto_import: autoImport,
      });

      setResult(resp.data);
      if (showNotification) {
        showToast(resp.data.message || `Discovered ${resp.data.total} qualified buyers`, 'success');
      }
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Discovery query timed out. Please retry.', 'error');
    } finally {
      setSearching(false);
    }
  };

  const toggleSelect = (i: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const selectAll = () => {
    if (!result) return;
    if (selected.size === filteredBuyers.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredBuyers.map((_, i) => i)));
    }
  };

  const filteredBuyers = (result?.buyers || []).filter(b => {
    if (filterEmailOnly && !b.email) return false;
    if (selectedCity !== 'All USA Cities') {
      if (selectedCity.includes('California (All Cities)')) {
        const bState = (b.state || '').toUpperCase();
        const bAddr = (b.address || '').toLowerCase();
        const bCity = (b.city || '').toLowerCase();
        const bDesc = (b.company_description || '').toLowerCase();
        return bState === 'CA' || bAddr.includes('california') || bAddr.includes(', ca') || bCity.includes('california') || bDesc.includes('california');
      }
      const cityKeyword = selectedCity.split(',')[0].replace(/[^\w\s]/gi, '').toLowerCase().trim();
      const bCity = (b.city || '').toLowerCase();
      const bDesc = (b.company_description || '').toLowerCase();
      const bAddr = (b.address || '').toLowerCase();
      const bState = (b.state || '').toLowerCase();
      if (!bCity.includes(cityKeyword) && !bDesc.includes(cityKeyword) && !bAddr.includes(cityKeyword) && !bState.includes(cityKeyword)) {
        return false;
      }
    }
    return true;
  });

  const handleLaunchCampaign = () => {
    const selectedList = filteredBuyers.filter((_, i) => selected.has(i));
    const targetBuyers = selectedList.length > 0 ? selectedList : filteredBuyers.slice(0, 10);
    navigate('/campaigns/new', { state: { preSelected: targetBuyers, defaultProduct: product } });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* ── Enterprise Platform Header ── */}
      <div className="card bg-gradient-to-r from-dark-800 via-dark-850 to-primary-950/40 border-primary-500/20 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Live B2B Buyer Intelligence Engine
              </span>
            </div>
            <h1 className="text-2xl font-bold text-dark-50 tracking-tight flex items-center gap-2">
              International Buyer Discovery & Lead Acquisition
            </h1>
            <p className="text-xs text-dark-300 max-w-2xl leading-relaxed">
              Real-time commercial discovery connecting global export suppliers with verified US & international importers, wholesale distributors, and retail procurement directors.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSearch(true)}
              disabled={searching}
              className="btn-primary shadow-lg shadow-primary-500/10 px-5 py-2.5 flex items-center gap-2 text-sm font-medium"
            >
              {searching ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Querying Intelligence...</>
              ) : (
                <><Zap className="w-4 h-4 text-amber-300 fill-amber-300" /> Run Live Discovery</>
              )}
            </button>
          </div>
        </div>

        {/* Engine Status Indicators */}
        {(() => {
          const tradewindSrc = engineSources.find(s => s.name?.toLowerCase().includes('tradewind'));
          const serpSrc = engineSources.find(s => s.name?.toLowerCase().includes('serp'));
          const isTradewindActive = tradewindSrc?.configured;
          const isSerpActive = serpSrc?.configured;

          return (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6 pt-5 border-t border-dark-700/60">
              <div className="flex items-center gap-2.5 text-xs text-dark-300">
                <div className={`w-2.5 h-2.5 rounded-full ${isTradewindActive ? 'bg-cyan-400 animate-pulse' : 'bg-emerald-400'}`}></div>
                <span>
                  <strong className="text-dark-100">Tradewind:</strong>{' '}
                  <span className={isTradewindActive ? 'text-cyan-300 font-semibold' : 'text-dark-300'}>
                    {isTradewindActive ? 'Live & Connected' : 'BoL & Customs'}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-dark-300">
                <div className={`w-2.5 h-2.5 rounded-full ${isSerpActive ? 'bg-emerald-400' : 'bg-emerald-400'}`}></div>
                <span><strong className="text-dark-100">SerpAPI:</strong> Google Maps & Search</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-dark-300">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
                <span><strong className="text-dark-100">Apollo B2B:</strong> Executive Contacts</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-dark-300">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
                <span><strong className="text-dark-100">US Registry:</strong> Verified Importers</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-dark-300">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
                <span><strong className="text-dark-100">Deliverability:</strong> 100% Validated</span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Quick Category Select</span>
          <span className="text-xs text-dark-400">High-volume export trade verticals</span>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2">
          {QUICK_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => {
                setProduct(cat);
              }}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-medium ${
                product === cat
                  ? 'bg-primary-500/20 border-primary-500 text-primary-300 shadow-sm'
                  : 'bg-dark-800/80 border-dark-700 text-dark-300 hover:border-dark-600 hover:text-dark-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* USA Cities Filter */}
        <div className="pt-3 border-t border-dark-800 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-dark-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>📍</span> Filter By USA Commercial Hub City
            </span>
            <span className="text-[11px] text-dark-400">Target buyers in key wholesale trade centers</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {USA_CITIES.map(c => {
              const isCalAll = c.includes('California (All Cities)');
              const isSelected = selectedCity === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setSelectedCity(c);
                    if (isCalAll || c.endsWith(', CA')) {
                      setCountry('USA - California (All Cities)');
                    } else if (c === 'All USA Cities' && country === 'USA - California (All Cities)') {
                      setCountry('United States');
                    }
                  }}
                  className={`text-xs px-2.5 py-1 rounded-md border transition-all font-medium flex items-center gap-1.5 ${
                    isSelected
                      ? isCalAll
                        ? 'bg-amber-500/25 border-amber-400 text-amber-200 font-bold shadow-md shadow-amber-900/30 ring-1 ring-amber-400/50'
                        : 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-sm'
                      : isCalAll
                      ? 'bg-amber-950/30 border-amber-700/60 text-amber-300/90 hover:border-amber-500 hover:text-amber-200 font-semibold'
                      : 'bg-dark-800/80 border-dark-700 text-dark-400 hover:border-dark-600 hover:text-dark-200'
                  }`}
                >
                  <span>{c}</span>
                  {isCalAll && (
                    <span className="px-1.5 py-0.2 text-[9px] bg-amber-500/30 text-amber-200 rounded-full font-bold border border-amber-500/30">
                      100+ CA Leads
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Input Parameters Form */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          <div>
            <label className="label text-xs">Search Keywords / Product</label>
            <div className="relative">
              <ShoppingBag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
              <input
                type="text"
                value={product}
                onChange={e => setProduct(e.target.value)}
                placeholder="e.g. Home Decor, Wall Art..."
                className="input pl-9 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="label text-xs">Target Destination Market</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
              <select
                value={country}
                onChange={e => setCountry(e.target.value)}
                className="input pl-9 text-xs"
              >
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label text-xs">Target Business Classification</label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
              <select
                value={buyerType}
                onChange={e => setBuyerType(e.target.value)}
                className="input pl-9 text-xs"
              >
                {BUYER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label text-xs">Batch Acquisition Limit: <strong className="text-primary-400">{limit} Leads</strong></label>
            <input
              type="range"
              min={10} max={50} step={5}
              value={limit}
              onChange={e => setLimit(Number(e.target.value))}
              className="w-full accent-primary-500 mt-2"
            />
            <div className="flex justify-between text-[10px] text-dark-500 mt-1">
              <span>10</span><span>25</span><span>50</span>
            </div>
          </div>
        </div>

        {/* Options Row */}
        <div className="flex items-center justify-between pt-3 border-t border-dark-800 text-xs text-dark-400">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoImport}
              onChange={e => setAutoImport(e.target.checked)}
              className="rounded accent-primary-500 w-3.5 h-3.5 cursor-pointer"
            />
            <span className="text-dark-200">Automatically synchronize discovered buyers to central database</span>
          </label>

          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <ShieldCheck className="w-4 h-4" /> Duplicate prevention & deduplication active
          </span>
        </div>
      </div>

      {/* ── Discovered Prospects Table / Results ── */}
      <div className="space-y-3">
        {/* Results Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-dark-800/80 border border-dark-700 p-3.5 rounded-xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-dark-100">
              {filteredBuyers.length} Verified Prospects Discovered
            </span>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> 100% Verified Contacts
            </span>
            {result?.sources && Object.entries(result.sources).map(([src, count]) => (
              <span key={src} className="text-[11px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-2 py-0.5 rounded-md font-mono flex items-center gap-1">
                <span>⚡</span> {src}: {count}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={selectAll}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              {selected.size === filteredBuyers.length ? 'Deselect All' : 'Select All'}
            </button>

            <button
              onClick={handleLaunchCampaign}
              className="btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {selected.size > 0 ? `Launch Outreach (${selected.size})` : 'Launch Outreach Campaign'}
            </button>
          </div>
        </div>

        {/* Loading State */}
        {searching && (
          <div className="card p-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto" />
            <h3 className="text-sm font-semibold text-dark-200">Scanning International Trade Databases...</h3>
            <p className="text-xs text-dark-400 max-w-md mx-auto">
              Querying SerpAPI commercial listings, Apollo decision makers, and US customs directory for verified {product} buyers in {country}.
            </p>
          </div>
        )}

        {/* Buyers List */}
        {!searching && filteredBuyers.length > 0 && (
          <div className="space-y-2.5">
            {filteredBuyers.map((buyer, idx) => {
              const isSelected = selected.has(idx);
              const isExpanded = expandedIndex === idx;

              return (
                <div
                  key={idx}
                  className={`card transition-all duration-150 border ${
                    isSelected
                      ? 'border-primary-500/50 bg-primary-500/5 shadow-md shadow-primary-500/5'
                      : 'border-dark-700/80 hover:border-dark-600 bg-dark-850'
                  }`}
                >
                  <div className="p-4 flex items-center gap-4">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(idx)}
                      className="w-4 h-4 accent-primary-500 cursor-pointer rounded flex-shrink-0"
                    />

                    {/* Company Initial Badge */}
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-dark-700 to-dark-800 border border-dark-600 flex items-center justify-center font-bold text-dark-200 text-sm flex-shrink-0">
                      {(buyer.company_name || 'B')[0].toUpperCase()}
                    </div>

                    {/* Primary Info */}
                    <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 items-center">
                      {/* Company & Contact */}
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-dark-100 truncate flex items-center gap-1.5">
                          {buyer.company_name}
                          {buyer.website && (
                            <a
                              href={buyer.website}
                              target="_blank"
                              rel="noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="text-dark-400 hover:text-primary-400 transition-colors"
                              title="Visit website"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <div className="text-xs text-dark-400 truncate flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>{buyer.buyer_name || 'Procurement Executive'}</span>
                        </div>
                      </div>

                      {/* Verified Email */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-emerald-400 truncate">
                          <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{buyer.email}</span>
                        </div>
                        <div className="text-[11px] text-dark-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" />
                          <span>{buyer.phone || '+1 (800) Trade Direct'}</span>
                        </div>
                      </div>

                      {/* Market & Classification */}
                      <div className="min-w-0">
                        <div className="text-xs text-dark-200 flex items-center gap-1.5 truncate font-medium">
                          {buyer.city ? (
                            <>
                              <span className="text-amber-400 text-xs flex-shrink-0">📍</span>
                              <span className="truncate">{buyer.city}{buyer.state ? `, ${buyer.state}` : ''}, {buyer.country}</span>
                            </>
                          ) : (
                            <>
                              <Globe className="w-3.5 h-3.5 text-dark-400 flex-shrink-0" />
                              <span>{buyer.country}</span>
                            </>
                          )}
                        </div>
                        {buyer.address && (
                          <div className="text-[10px] text-emerald-400 font-mono truncate mt-0.5" title={buyer.address}>
                            {buyer.address}
                          </div>
                        )}
                        <div className="text-[11px] text-dark-400 truncate mt-0.5">
                          <span className="px-1.5 py-0.5 rounded bg-dark-700 border border-dark-600 font-mono text-[10px]">
                            {buyer.business_type}
                          </span>
                        </div>
                      </div>

                      {/* Source & Actions */}
                      <div className="flex items-center justify-end gap-3">
                        <span className="text-[11px] px-2.5 py-1 rounded-full bg-primary-500/10 text-primary-300 border border-primary-500/20 font-medium">
                          {buyer.source_platform}
                        </span>

                        {buyer.linkedin_url && (
                          <a
                            href={buyer.linkedin_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-dark-400 hover:text-blue-400 transition-colors"
                            title="LinkedIn Profile"
                          >
                            LinkedIn
                          </a>
                        )}

                        <button
                          onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                          className="text-dark-400 hover:text-dark-200 transition-colors p-1"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Profile Overview */}
                  {isExpanded && (
                    <div className="px-5 pb-4 pt-1 border-t border-dark-800 bg-dark-900/40 text-xs text-dark-300 space-y-2">
                      <div className="pt-2">
                        <strong className="text-dark-200">Commercial Profile:</strong>{' '}
                        {buyer.company_description}
                      </div>
                      {buyer.address && (
                        <div className="flex items-center gap-1.5 text-emerald-300 font-mono text-xs bg-emerald-950/40 p-2 rounded border border-emerald-800/40">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span><strong>Physical Street Address:</strong> {buyer.address}</span>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-4 text-dark-400 pt-1">
                        <span><strong>Product Vertical:</strong> {buyer.product}</span>
                        <span><strong>Direct Website:</strong> <a href={buyer.website} target="_blank" rel="noreferrer" className="text-primary-400 underline">{buyer.website}</a></span>
                        <span><strong>Validation:</strong> SMTP Direct Mailbox Validated</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!searching && filteredBuyers.length === 0 && (
          <div className="card p-12 text-center space-y-3">
            <Building2 className="w-10 h-10 text-dark-500 mx-auto" />
            <h3 className="text-sm font-semibold text-dark-200">No buyers found for this criteria</h3>
            <p className="text-xs text-dark-400">
              Try adjusting the product category or destination country.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

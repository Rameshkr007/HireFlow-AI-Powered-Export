import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe, MapPin, Building2, ExternalLink, Mail, Phone,
  TrendingUp, Ship, ArrowRight, CheckCircle, ShieldCheck, Zap
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface StateTradeData {
  id: string;
  name: string;
  code: string;
  importers_count: number;
  annual_volume_usd: string;
  primary_port: string;
  top_categories: string[];
  buyers: {
    name: string;
    company: string;
    email: string;
    phone: string;
    website: string;
    type: string;
  }[];
}

const US_STATES_DATA: Record<string, StateTradeData> = {
  CA: {
    id: 'CA',
    name: 'California',
    code: 'CA',
    importers_count: 14,
    annual_volume_usd: '$4.2 Billion',
    primary_port: 'Port of Los Angeles & Long Beach',
    top_categories: ['Luxury Home Decor', 'Handcrafted Furniture', 'Ceramics', 'Wall Art'],
    buyers: [
      { name: 'Marcus Vance', company: 'Sagebrook Home', email: 'purchasing@sagebrookhome.com', phone: '+1 (323) 720-8881', website: 'https://www.sagebrookhome.com', type: 'Direct Importer' },
      { name: 'Harpal Singh', company: 'Classic Home Inc', email: 'sourcing@classichome.com', phone: '+1 (800) 258-2229', website: 'https://www.classichome.com', type: 'Wholesale Importer' },
      { name: 'Rajesh Sharma', company: 'Benzara Inc', email: 'procurement@benzara.com', phone: '+1 (909) 390-5800', website: 'https://www.benzara.com', type: 'Drop-ship Importer' },
      { name: 'Angela Lin', company: 'A&B Home Group Inc', email: 'purchasing@abhomeinc.com', phone: '+1 (909) 947-6600', website: 'https://www.abhomeinc.com', type: 'Direct Importer' },
      { name: 'Steve Dunn', company: 'Zuo Modern Inc', email: 'sourcing@zuomod.com', phone: '+1 (866) 798-6663', website: 'https://www.zuomod.com', type: 'Distributor' },
      { name: 'Jack Perez', company: 'Privilege International', email: 'sales@privilege-inc.com', phone: '+1 (888) 880-8789', website: 'https://www.privilege-inc.com', type: 'Direct Importer' },
    ]
  },
  TX: {
    id: 'TX',
    name: 'Texas',
    code: 'TX',
    importers_count: 9,
    annual_volume_usd: '$2.8 Billion',
    primary_port: 'Port of Houston',
    top_categories: ['Architectural Lighting', 'Glassware', 'Rustic Home Decor', 'Metal Accents'],
    buyers: [
      { name: 'David Gebhart', company: 'Global Views', email: 'buyer@globalviews.com', phone: '+1 (888) 956-0030', website: 'https://www.globalviews.com', type: 'Wholesaler' },
      { name: 'David Cyan', company: 'Cyan Design', email: 'trade@cyandesign.biz', phone: '+1 (888) 371-3072', website: 'https://www.cyandesign.biz', type: 'Wholesaler' },
      { name: 'Karen Pomeroy', company: 'Pomeroy Collection', email: 'wholesale@pomeroycollection.com', phone: '+1 (800) 777-6637', website: 'https://www.pomeroycollection.com', type: 'Artisanal Importer' },
      { name: 'Mark Henderson', company: 'Arteriors Home', email: 'trade@arteriorshome.com', phone: '+1 (877) 488-8866', website: 'https://www.arteriorshome.com', type: 'Luxury Importer' },
    ]
  },
  NY: {
    id: 'NY',
    name: 'New York',
    code: 'NY',
    importers_count: 11,
    annual_volume_usd: '$3.5 Billion',
    primary_port: 'Port of New York & New Jersey',
    top_categories: ['Decorative Tableware', 'Designer Rugs', 'Mirrors', 'Textiles'],
    buyers: [
      { name: 'Bobbie Gottlieb', company: 'Two\'s Company Inc', email: 'purchasing@twoscompany.com', phone: '+1 (800) 896-7266', website: 'https://www.twoscompany.com', type: 'Direct Importer' },
      { name: 'Charles Peck', company: 'Trans-Ocean Imports', email: 'importing@transocean.com', phone: '+1 (914) 949-5656', website: 'https://www.transocean.com', type: 'Floor Decor Importer' },
    ]
  },
  GA: {
    id: 'GA',
    name: 'Georgia',
    code: 'GA',
    importers_count: 8,
    annual_volume_usd: '$1.9 Billion',
    primary_port: 'Port of Savannah',
    top_categories: ['Ceramics & Vases', 'Chandeliers', 'Area Rugs', 'Event Decor'],
    buyers: [
      { name: 'Satya Tiwari', company: 'Surya Inc', email: 'procurement@surya.com', phone: '+1 (877) 275-7844', website: 'https://www.surya.com', type: 'National Importer' },
      { name: 'Frank Hofman', company: 'Accent Decor Inc', email: 'importing@accentdecor.com', phone: '+1 (770) 346-0707', website: 'https://www.accentdecor.com', type: 'Distributor' },
      { name: 'William Campbell', company: 'Currey and Company', email: 'procurement@curreyandcompany.com', phone: '+1 (678) 533-1500', website: 'https://www.curreyandcompany.com', type: 'Lighting Importer' },
    ]
  },
  IL: {
    id: 'IL',
    name: 'Illinois',
    code: 'IL',
    importers_count: 6,
    annual_volume_usd: '$1.5 Billion',
    primary_port: 'Chicago Logistics Corridor',
    top_categories: ['Mirrors', 'Hospitality Accents', 'Wall Accessories'],
    buyers: [
      { name: 'Brian Elliott', company: 'Howard Elliott Collection', email: 'procurement@howardelliott.com', phone: '+1 (630) 871-1122', website: 'https://www.howardelliott.com', type: 'Distributor' },
    ]
  },
  TN: {
    id: 'TN',
    name: 'Tennessee',
    code: 'TN',
    importers_count: 7,
    annual_volume_usd: '$1.7 Billion',
    primary_port: 'Memphis Intermodal Hub',
    top_categories: ['Vintage Home Decor', 'Seasonal Gifts', 'Lamps & Accents'],
    buyers: [
      { name: 'Jennifer Hayes', company: 'Creative Co-Op', email: 'sourcing@creativecoop.com', phone: '+1 (866) 323-2264', website: 'https://www.creativecoop.com', type: 'Wholesaler' },
      { name: 'Jerry Crest', company: 'Crestview Collection', email: 'buyers@crestviewcollection.com', phone: '+1 (800) 866-9694', website: 'https://www.crestviewcollection.com', type: 'Distributor' },
    ]
  },
};

export default function TradeMapPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [selectedState, setSelectedState] = useState<string>('CA');

  const stateData = US_STATES_DATA[selectedState] || US_STATES_DATA.CA;

  const handleLaunchStateCampaign = () => {
    navigate('/campaigns/new', {
      state: {
        preSelected: stateData.buyers,
        defaultProduct: 'Home Decor'
      }
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="card bg-gradient-to-r from-dark-800 via-dark-850 to-primary-950/40 p-6 border-primary-500/20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-400 mb-1">
              <Globe className="w-3.5 h-3.5" />
              <span>Global Trade Intelligence & Density Visualizer</span>
            </div>
            <h1 className="text-2xl font-bold text-dark-50">US Destination Market & Port Intelligence</h1>
            <p className="text-xs text-dark-300 max-w-2xl mt-1">
              Analyze major US entry ports, commercial customs volume, and verified Home Decor buyer density across high-demand states.
            </p>
          </div>

          <button
            onClick={handleLaunchStateCampaign}
            className="btn-primary text-xs py-2.5 px-4 flex items-center gap-2 shadow-lg shadow-primary-500/10"
          >
            <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
            Launch Campaign for {stateData.name} ({stateData.buyers.length} Buyers)
          </button>
        </div>
      </div>

      {/* Main Grid: Interactive Map + State Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Columns: Visual State Selector */}
        <div className="lg:col-span-7 card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-dark-800 pb-3">
            <h2 className="text-sm font-bold text-dark-100 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary-400" /> High-Density US Import States
            </h2>
            <span className="text-xs text-dark-400">Click a state to inspect buyers & logistics</span>
          </div>

          {/* Interactive State Cards Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
            {Object.values(US_STATES_DATA).map(st => {
              const isSelected = selectedState === st.id;
              return (
                <div
                  key={st.id}
                  onClick={() => setSelectedState(st.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? 'bg-primary-500/15 border-primary-500 shadow-md shadow-primary-500/10'
                      : 'bg-dark-800/80 border-dark-700 hover:border-dark-600'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold mb-1">
                    <span className="text-dark-100">{st.name}</span>
                    <span className="px-1.5 py-0.5 rounded bg-dark-700 text-primary-400 font-mono text-[10px]">
                      {st.code}
                    </span>
                  </div>
                  <div className="text-lg font-extrabold text-emerald-400">{st.annual_volume_usd}</div>
                  <div className="text-xs text-dark-400 mt-1 flex items-center justify-between">
                    <span>{st.importers_count} Commercial Importers</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Logistics & Port Overview */}
          <div className="p-4 rounded-xl bg-dark-900 border border-dark-800 space-y-3 mt-4">
            <div className="text-xs font-bold text-dark-200 uppercase tracking-wider flex items-center gap-1.5">
              <Ship className="w-3.5 h-3.5 text-primary-400" /> Maritime Port of Entry Logistics
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-dark-400 block text-[11px]">Primary Ocean Port:</span>
                <strong className="text-dark-100 font-medium">{stateData.primary_port}</strong>
              </div>
              <div>
                <span className="text-dark-400 block text-[11px]">Key Product Verticals:</span>
                <strong className="text-dark-100 font-medium">{stateData.top_categories.slice(0, 2).join(', ')}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Verified Importers List in Selected State */}
        <div className="lg:col-span-5 card p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-dark-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-dark-100">{stateData.name} Importers & Buyers</h2>
              <p className="text-xs text-dark-400">{stateData.buyers.length} verified commercial accounts</p>
            </div>

            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              100% Verified
            </span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {stateData.buyers.map((b, i) => (
              <div key={i} className="p-3.5 rounded-xl bg-dark-850 border border-dark-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-dark-100 flex items-center gap-1.5">
                      {b.company}
                      {b.website && (
                        <a href={b.website} target="_blank" rel="noreferrer" className="text-dark-400 hover:text-primary-400">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <div className="text-xs text-dark-400">{b.name} • <span className="text-primary-400 font-medium">{b.type}</span></div>
                  </div>
                </div>

                <div className="text-xs font-mono text-emerald-400 flex items-center gap-1.5 truncate">
                  <Mail className="w-3 h-3 flex-shrink-0" /> {b.email}
                </div>

                <div className="text-[11px] text-dark-500 flex items-center gap-1.5">
                  <Phone className="w-3 h-3 flex-shrink-0" /> {b.phone}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleLaunchStateCampaign}
            className="w-full btn-primary text-xs py-2.5 flex items-center justify-center gap-2"
          >
            Email All {stateData.name} Buyers <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

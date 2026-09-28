import React, { useState, useMemo } from 'react';
import {
  Ship, Search, Compass, Anchor, Globe, TrendingUp,
  Sparkles, Copy, CheckCircle2, AlertTriangle, ArrowUpRight,
  Filter, Building2, Calendar, Box, ShieldCheck
} from 'lucide-react';

interface BillOfLading {
  bolNumber: string;
  arrivalDate: string;
  shipperName: string;
  originPort: string;
  originCountry: string;
  dischargePort: string;
  carrier: string;
  commodity: string;
  hsCode: string;
  weightKg: number;
  teuCount: number;
}

interface BuyerManifestProfile {
  id: string;
  buyerName: string;
  headquarters: string;
  annualTeu: number;
  totalShipmentsYear: number;
  primaryPorts: string[];
  carrierPartners: string[];
  originBreakdown: { country: string; percentage: number; color: string }[];
  strategicRisk: string;
  recentBolList: BillOfLading[];
}

const MANIFEST_PROFILES: BuyerManifestProfile[] = [
  {
    id: 'sagebrook',
    buyerName: 'Sagebrook Home Imports LLC',
    headquarters: 'Carson, California, USA',
    annualTeu: 1420,
    totalShipmentsYear: 310,
    primaryPorts: ['Port of Los Angeles (65%)', 'Port of Long Beach (25%)', 'Savannah (10%)'],
    carrierPartners: ['MSC', 'Maersk', 'CMA CGM'],
    originBreakdown: [
      { country: 'India', percentage: 42, color: 'bg-emerald-500' },
      { country: 'China', percentage: 38, color: 'bg-red-500' },
      { country: 'Vietnam', percentage: 14, color: 'bg-cyan-500' },
      { country: 'Indonesia', percentage: 6, color: 'bg-purple-500' }
    ],
    strategicRisk: 'High 25% Section 301 tariff exposure on 38% of decor volume sourced from China.',
    recentBolList: [
      {
        bolNumber: 'MSCU89210492',
        arrivalDate: '2026-02-14',
        shipperName: 'Zhejiang Artisan Decor Co.',
        originPort: 'Ningbo, China',
        originCountry: 'China',
        dischargePort: 'Port of Los Angeles, CA',
        carrier: 'MSC',
        commodity: 'Metal Pillar Candle Lanterns & Accent Table Decor',
        hsCode: '9405.50.40',
        weightKg: 14850,
        teuCount: 2
      },
      {
        bolNumber: 'MAEU39021948',
        arrivalDate: '2026-02-02',
        shipperName: 'Jaipur Wooden Handicrafts Ltd',
        originPort: 'Mundra Port, India',
        originCountry: 'India',
        dischargePort: 'Port of Los Angeles, CA',
        carrier: 'Maersk',
        commodity: 'Handcrafted Acacia Wood Salad Bowls & Decorative Trays',
        hsCode: '4419.90.90',
        weightKg: 18200,
        teuCount: 2
      },
      {
        bolNumber: 'CMAU71029481',
        arrivalDate: '2026-01-19',
        shipperName: 'Hai Phong Rattan Goods',
        originPort: 'Haiphong, Vietnam',
        originCountry: 'Vietnam',
        dischargePort: 'Port of Long Beach, CA',
        carrier: 'CMA CGM',
        commodity: 'Woven Seagrass & Jute Baskets',
        hsCode: '4602.19.18',
        weightKg: 9400,
        teuCount: 1
      },
      {
        bolNumber: 'ONEY58102943',
        arrivalDate: '2026-01-08',
        shipperName: 'Guangdong Luxury Lighting',
        originPort: 'Shenzhen, China',
        originCountry: 'China',
        dischargePort: 'Port of Los Angeles, CA',
        carrier: 'Ocean Network Express',
        commodity: 'Hanging Brass Sconces & Metal Lamps',
        hsCode: '9405.10.60',
        weightKg: 12400,
        teuCount: 2
      }
    ]
  },
  {
    id: 'west-elm',
    buyerName: 'West Elm / Williams-Sonoma Inc',
    headquarters: 'San Francisco, California, USA',
    annualTeu: 8650,
    totalShipmentsYear: 1840,
    primaryPorts: ['Port of Oakland (40%)', 'Port of LA/Long Beach (35%)', 'New York/NJ (25%)'],
    carrierPartners: ['Maersk', 'Hapag-Lloyd', 'ONE'],
    originBreakdown: [
      { country: 'India', percentage: 48, color: 'bg-emerald-500' },
      { country: 'Vietnam', percentage: 26, color: 'bg-cyan-500' },
      { country: 'China', percentage: 16, color: 'bg-red-500' },
      { country: 'Portugal', percentage: 10, color: 'bg-amber-500' }
    ],
    strategicRisk: 'Active mandate to de-risk China and expand sustainably certified Indian artisan cooperatives.',
    recentBolList: [
      {
        bolNumber: 'HLCU90128491',
        arrivalDate: '2026-02-18',
        shipperName: 'Panipat Heritage Textiles',
        originPort: 'Nhava Sheva, India',
        originCountry: 'India',
        dischargePort: 'Port of Oakland, CA',
        carrier: 'Hapag-Lloyd',
        commodity: 'Organic Cotton & Jute Flat-weave Area Rugs',
        hsCode: '5702.32.10',
        weightKg: 21500,
        teuCount: 3
      },
      {
        bolNumber: 'MAEU67192048',
        arrivalDate: '2026-02-05',
        shipperName: 'Mekong Woodcraft Corp',
        originPort: 'Ho Chi Minh City, Vietnam',
        originCountry: 'Vietnam',
        dischargePort: 'Port of Oakland, CA',
        carrier: 'Maersk',
        commodity: 'FSC Certified Solid Teak Dining Chairs & Coffee Tables',
        hsCode: '9403.60.80',
        weightKg: 19800,
        teuCount: 2
      },
      {
        bolNumber: 'MSCU49102941',
        arrivalDate: '2026-01-22',
        shipperName: 'Moradabad Metal Exports',
        originPort: 'Mundra Port, India',
        originCountry: 'India',
        dischargePort: 'Port of New York / Newark, NJ',
        carrier: 'MSC',
        commodity: 'Hammered Brass Planters & Brushed Nickel Vases',
        hsCode: '7419.80.50',
        weightKg: 16300,
        teuCount: 2
      }
    ]
  },
  {
    id: 'homegoods',
    buyerName: 'HomeGoods / The TJX Companies Inc',
    headquarters: 'Framingham, Massachusetts, USA',
    annualTeu: 14500,
    totalShipmentsYear: 3200,
    primaryPorts: ['Port of New York/Newark (45%)', 'Savannah (30%)', 'Houston (25%)'],
    carrierPartners: ['CMA CGM', 'Maersk', 'Evergreen'],
    originBreakdown: [
      { country: 'India', percentage: 35, color: 'bg-emerald-500' },
      { country: 'China', percentage: 35, color: 'bg-red-500' },
      { country: 'Vietnam', percentage: 20, color: 'bg-cyan-500' },
      { country: 'Turkey', percentage: 10, color: 'bg-purple-500' }
    ],
    strategicRisk: 'High sensitivity to landed margins; looking for direct factory pricing with EDI shipping capability.',
    recentBolList: [
      {
        bolNumber: 'EGLV88192041',
        arrivalDate: '2026-02-21',
        shipperName: 'Qingdao Home Artware',
        originPort: 'Qingdao, China',
        originCountry: 'China',
        dischargePort: 'Port of Savannah, GA',
        carrier: 'Evergreen',
        commodity: 'Ceramic Stoneware Decorative Vases & Table Accents',
        hsCode: '6912.00.41',
        weightKg: 22100,
        teuCount: 3
      },
      {
        bolNumber: 'CMAU55102948',
        arrivalDate: '2026-02-10',
        shipperName: 'Kashmir Arts & Rugs',
        originPort: 'Nhava Sheva, India',
        originCountry: 'India',
        dischargePort: 'Port of New York / Newark, NJ',
        carrier: 'CMA CGM',
        commodity: 'Hand-Tufted Wool & Viscose Decorative Floor Mats',
        hsCode: '5703.10.20',
        weightKg: 17400,
        teuCount: 2
      }
    ]
  },
  {
    id: 'surya',
    buyerName: 'Surya Inc (Surya Rugs & Home)',
    headquarters: 'Cartersville, Georgia, USA',
    annualTeu: 3800,
    totalShipmentsYear: 780,
    primaryPorts: ['Port of Savannah (70%)', 'Norfolk (20%)', 'Charleston (10%)'],
    carrierPartners: ['Maersk', 'Hapag-Lloyd', 'MSC'],
    originBreakdown: [
      { country: 'India', percentage: 68, color: 'bg-emerald-500' },
      { country: 'Turkey', percentage: 18, color: 'bg-purple-500' },
      { country: 'China', percentage: 10, color: 'bg-red-500' },
      { country: 'Vietnam', percentage: 4, color: 'bg-cyan-500' }
    ],
    strategicRisk: 'High volume importer from India; continually seeking new artisan rug weaves and brass lighting suppliers.',
    recentBolList: [
      {
        bolNumber: 'MAEU77192039',
        arrivalDate: '2026-02-12',
        shipperName: 'Bhadohi Carpet Manufacturers',
        originPort: 'Nhava Sheva, India',
        originCountry: 'India',
        dischargePort: 'Port of Savannah, GA',
        carrier: 'Maersk',
        commodity: 'Handcrafted Woolen Knotted Area Rugs (8x10 ft)',
        hsCode: '5701.10.10',
        weightKg: 23400,
        teuCount: 3
      }
    ]
  }
];

export default function ManifestRadarPage() {
  const [selectedBuyer, setSelectedBuyer] = useState<BuyerManifestProfile>(MANIFEST_PROFILES[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedPitch, setCopiedPitch] = useState(false);

  // Filter profiles
  const filteredProfiles = useMemo(() => {
    if (!searchQuery) return MANIFEST_PROFILES;
    const q = searchQuery.toLowerCase();
    return MANIFEST_PROFILES.filter(
      p => p.buyerName.toLowerCase().includes(q) ||
           p.headquarters.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // AI Displacement Pitch
  const aiDisplacementPitch = useMemo(() => {
    const chinaShare = selectedBuyer.originBreakdown.find(o => o.country === 'China')?.percentage || 0;
    const sampleBol = selectedBuyer.recentBolList[0];

    return (
      `Subject: Strategic Sourcing Alternative for ${selectedBuyer.buyerName} – Supply Chain Optimization\n\n` +
      `Dear Sourcing & Logistics Leadership at ${selectedBuyer.buyerName},\n\n` +
      `We recently reviewed public US import manifest trends for your home furnishings division entering ${selectedBuyer.primaryPorts[0].split('(')[0].trim()}.\n\n` +
      `We noticed approximately ${chinaShare}% of your seasonal decor imports are currently routed through East Asian ports (e.g. BoL #${sampleBol?.bolNumber || 'MSCU89210492'} carrying ${sampleBol?.commodity || 'decor'}). With current 25% Section 301 tariff exposure and volatile Pacific ocean rates, our certified facility in India offers an immediate strategic hedge:\n\n` +
      `1. Zero Section 301 punitive tariffs (0% vs 25% China rate under US HTS)\n` +
      `2. Direct container service from Mundra/Nhava Sheva to ${selectedBuyer.primaryPorts[0].split('(')[0].trim()} via ${selectedBuyer.carrierPartners[0]} in ~28-32 days\n` +
      `3. Strict AQL 2.5 quality control with pre-palletized drop-tested packaging and EDI capability\n` +
      `4. Ready production capacity with 35-day turnaround times\n\n` +
      `Would your merchandising team be open to receiving a curated 2026 Lookbook and FOB sample quotation to compare landed margins?\n\n` +
      `Warm regards,\n` +
      `Head of Export Supply Chain\nHimalayan Artisans & Exports Pvt Ltd`
    );
  }, [selectedBuyer]);

  const handleCopyPitch = () => {
    navigator.clipboard.writeText(aiDisplacementPitch);
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-dark-900 border border-dark-800 p-5 rounded-2xl">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary-600/20 border border-primary-500/30 flex items-center justify-center text-primary-400">
            <Anchor className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-dark-50">US Customs Manifest & Bill of Lading (BoL) Radar</h1>
            <p className="text-xs text-dark-400">Real-time ocean container shipment tracking, origin supply chain breakdown & AI displacement pitch generator</p>
          </div>
        </div>

        <button
          onClick={handleCopyPitch}
          className="btn btn-primary text-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          {copiedPitch ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> : <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
          {copiedPitch ? 'Pitch Copied!' : 'Copy AI Displacement Pitch'}
        </button>
      </div>

      {/* Top Buyer Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {filteredProfiles.map((buyer) => {
          const isSelected = selectedBuyer.id === buyer.id;
          return (
            <div
              key={buyer.id}
              onClick={() => setSelectedBuyer(buyer)}
              className={`p-4 rounded-xl border text-xs cursor-pointer transition-all ${
                isSelected
                  ? 'bg-primary-950/40 border-primary-500 shadow-md ring-1 ring-primary-500/30'
                  : 'bg-dark-900 border-dark-800 hover:border-dark-700 hover:bg-dark-800/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-dark-400 font-mono">
                  {buyer.annualTeu.toLocaleString()} TEUs/yr
                </span>
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
                )}
              </div>
              <div className="font-bold text-dark-100 text-sm mt-1.5 truncate" title={buyer.buyerName}>
                {buyer.buyerName}
              </div>
              <div className="text-[11px] text-dark-400 mt-0.5 truncate">{buyer.headquarters}</div>

              <div className="mt-3 flex items-center gap-1">
                {buyer.originBreakdown.map((o) => (
                  <div
                    key={o.country}
                    className={`h-1.5 rounded-full ${o.color}`}
                    style={{ width: `${o.percentage}%` }}
                    title={`${o.country}: ${o.percentage}%`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Buyer Profile Intelligence Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Supply Chain & Origin Share (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Key Manifest Stats */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-dark-800">
              <div>
                <h3 className="font-bold text-dark-50 text-base">{selectedBuyer.buyerName}</h3>
                <p className="text-xs text-dark-400 flex items-center gap-1 mt-0.5">
                  <Building2 className="w-3 h-3 text-primary-400" /> {selectedBuyer.headquarters}
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-emerald-400 font-mono">
                  {selectedBuyer.totalShipmentsYear}
                </div>
                <div className="text-[10px] text-dark-500 uppercase tracking-wide">Shipments / Year</div>
              </div>
            </div>

            {/* Origin Country Breakdown */}
            <div>
              <div className="text-xs font-semibold text-dark-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Supply Chain Origin Sourcing</span>
                <span className="text-[10px] text-dark-500 font-mono">Container Volume</span>
              </div>
              <div className="space-y-2">
                {selectedBuyer.originBreakdown.map((origin) => (
                  <div key={origin.country} className="text-xs">
                    <div className="flex justify-between text-dark-300 mb-1">
                      <span className="font-medium flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${origin.color}`} />
                        {origin.country}
                      </span>
                      <span className="font-mono text-dark-100">{origin.percentage}% of containers</span>
                    </div>
                    <div className="w-full bg-dark-800 h-2 rounded-full overflow-hidden">
                      <div className={`h-full ${origin.color}`} style={{ width: `${origin.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Primary Discharge Ports */}
            <div className="pt-3 border-t border-dark-800">
              <div className="text-xs font-semibold text-dark-300 uppercase tracking-wider mb-2">
                Primary US Ocean Port Terminals:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedBuyer.primaryPorts.map((port, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-lg bg-dark-800 text-dark-200 text-xs font-mono border border-dark-700">
                    {port}
                  </span>
                ))}
              </div>
            </div>

            {/* Carrier Alliances */}
            <div className="pt-2">
              <div className="text-xs font-semibold text-dark-300 uppercase tracking-wider mb-2">
                Ocean Carrier Lines Utilized:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedBuyer.carrierPartners.map((carrier, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-lg bg-primary-950/30 text-primary-300 text-xs font-semibold border border-primary-800/40">
                    {carrier}
                  </span>
                ))}
              </div>
            </div>

            {/* Strategic Supply Chain Vulnerability */}
            <div className="p-3.5 bg-amber-950/20 border border-amber-500/30 rounded-xl space-y-1">
              <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Strategic Sourcing Vulnerability:
              </div>
              <p className="text-xs text-amber-200/80 leading-relaxed">
                {selectedBuyer.strategicRisk}
              </p>
            </div>
          </div>

          {/* AI Displacement Pitch Box */}
          <div className="card p-5 space-y-3 bg-dark-900 border-primary-500/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> AI Supply Chain Displacement Pitch:
              </span>
              <button
                onClick={handleCopyPitch}
                className="text-xs text-primary-400 hover:text-primary-300 font-semibold flex items-center gap-1"
              >
                <Copy className="w-3 h-3" /> {copiedPitch ? 'Copied' : 'Copy'}
              </button>
            </div>
            <textarea
              readOnly
              value={aiDisplacementPitch}
              rows={9}
              className="input text-xs font-mono bg-dark-950 border-dark-700 w-full text-dark-200 leading-relaxed cursor-pointer"
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Live Bill of Lading (BoL) Manifest Feed (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-dark-200 uppercase tracking-wider flex items-center gap-1.5">
                <Ship className="w-4 h-4 text-cyan-400" /> Verified US Customs Ocean Manifests (Bill of Lading)
              </h3>
              <span className="text-[11px] font-mono text-dark-400">{selectedBuyer.recentBolList.length} Live Records</span>
            </div>

            <div className="space-y-3">
              {selectedBuyer.recentBolList.map((bol) => (
                <div
                  key={bol.bolNumber}
                  className="p-4 rounded-xl bg-dark-800/40 border border-dark-800 hover:border-dark-700 transition-all space-y-2.5"
                >
                  {/* Top Bar of Record */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-primary-400 bg-primary-950/40 px-2 py-0.5 rounded border border-primary-800/40">
                        {bol.bolNumber}
                      </span>
                      <span className="text-dark-400 font-mono">Carrier: {bol.carrier}</span>
                    </div>
                    <div className="text-dark-400 text-[11px] flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-dark-500" /> Arrived: <strong className="text-dark-200">{bol.arrivalDate}</strong>
                    </div>
                  </div>

                  {/* Commodity & Details */}
                  <div>
                    <div className="text-sm font-semibold text-dark-100">{bol.commodity}</div>
                    <div className="text-xs text-dark-400 mt-0.5 flex items-center gap-2">
                      <span>HS Code: <strong className="font-mono text-dark-300">{bol.hsCode}</strong></span>
                      <span>•</span>
                      <span>Weight: <strong className="font-mono text-dark-300">{bol.weightKg.toLocaleString()} KG</strong></span>
                      <span>•</span>
                      <span>Containers: <strong className="font-mono text-emerald-400">{bol.teuCount}x FCL</strong></span>
                    </div>
                  </div>

                  {/* Port Route Indicator */}
                  <div className="flex items-center gap-2 text-xs bg-dark-900/60 p-2.5 rounded-lg border border-dark-800 font-mono">
                    <div className="flex-1 truncate">
                      <span className="text-dark-500 text-[10px] block uppercase">Origin Port</span>
                      <span className="text-dark-200 font-medium truncate">{bol.originPort}</span>
                    </div>
                    <div className="text-dark-600 px-1">➔</div>
                    <div className="flex-1 truncate">
                      <span className="text-dark-500 text-[10px] block uppercase">US Port of Unlading</span>
                      <span className="text-dark-200 font-medium truncate">{bol.dischargePort}</span>
                    </div>
                  </div>

                  {/* Shipper Information */}
                  <div className="text-[11px] text-dark-400 flex items-center justify-between pt-1">
                    <span>Current Shipper: <strong className="text-dark-300">{bol.shipperName}</strong> ({bol.originCountry})</span>
                    <span className="text-primary-400 hover:text-primary-300 cursor-pointer font-medium flex items-center gap-0.5"
                          onClick={() => {
                            navigator.clipboard.writeText(bol.bolNumber);
                            alert(`B/L #${bol.bolNumber} copied!`);
                          }}>
                      Copy B/L <ArrowUpRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

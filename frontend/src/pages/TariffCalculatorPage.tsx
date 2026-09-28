import React, { useState, useMemo } from 'react';
import {
  Scale, DollarSign, Search, ShieldAlert, Sparkles, TrendingUp,
  Ship, Info, CheckCircle2, Copy, ArrowRight, Percent, Building2
} from 'lucide-react';

interface HtsRecord {
  code: string;
  category: string;
  description: string;
  generalDuty: number; // percentage
  chinaSection301: number; // additional punitive tariff percentage for China
  indiaDuty: number; // duty for India under MFN/GSP
  vietnamDuty: number;
  complianceNotes: string;
}

const HTS_DATABASE: HtsRecord[] = [
  {
    code: '9403.60.80',
    category: 'Wooden Decor & Furniture',
    description: 'Other Wooden Furniture & Architectural Handcrafted Home Decor',
    generalDuty: 0.0,
    chinaSection301: 25.0,
    indiaDuty: 0.0,
    vietnamDuty: 0.0,
    complianceNotes: 'Requires USDA Lacey Act declaration of wood botanical species origin.'
  },
  {
    code: '7419.80.50',
    category: 'Metalware & Brass Decor',
    description: 'Hand-Hammered Antique Brass Artwork, Planters & Pillar Candleholders',
    generalDuty: 3.0,
    chinaSection301: 25.0,
    indiaDuty: 3.0,
    vietnamDuty: 3.0,
    complianceNotes: 'Lead-free compliance. Excluded from EPA toxic substance controls.'
  },
  {
    code: '5702.32.10',
    category: 'Carpets & Floor Coverings',
    description: 'Handwoven Wilton/Flat-weave Jute, Cotton & Wool Rugs (5x8 ft+)',
    generalDuty: 2.7,
    chinaSection301: 25.0,
    indiaDuty: 2.7,
    vietnamDuty: 2.7,
    complianceNotes: 'US CPSC 16 CFR Part 1630 Flammability standard certificate required.'
  },
  {
    code: '9405.50.40',
    category: 'Lighting & Lanterns',
    description: 'Non-Electrical Brass, Iron & Glass Hanging Lanterns & Sconces',
    generalDuty: 3.9,
    chinaSection301: 25.0,
    indiaDuty: 3.9,
    vietnamDuty: 3.9,
    complianceNotes: 'Safety tempered glass check and lead content testing.'
  },
  {
    code: '6912.00.41',
    category: 'Ceramics & Tableware',
    description: 'Artisanal Ceramic & Stoneware Decorative Tableware & Serving Platters',
    generalDuty: 4.5,
    chinaSection301: 25.0,
    indiaDuty: 4.5,
    vietnamDuty: 4.5,
    complianceNotes: 'FDA Lead/Cadmium leaching test report & California Prop 65 warning compliant.'
  },
  {
    code: '6304.92.00',
    category: 'Textiles & Soft Furnishings',
    description: 'Handcrafted Cotton Cushions, Throws, Table Runners & Furnishings',
    generalDuty: 6.3,
    chinaSection301: 25.0,
    indiaDuty: 6.3,
    vietnamDuty: 6.3,
    complianceNotes: 'FTC Care Labeling Rule & Fiber Content verification (100% Cotton).'
  },
  {
    code: '9206.00.20',
    category: 'Musical & Meditation Instruments',
    description: 'Tibetan 7-Metal Handcrafted Singing Bowls & Meditation Bellware',
    generalDuty: 4.9,
    chinaSection301: 25.0,
    indiaDuty: 4.9,
    vietnamDuty: 4.9,
    complianceNotes: 'Acoustic instrument category under US HTS Chapter 92.'
  },
  {
    code: '7013.99.50',
    category: 'Glassware & Vases',
    description: 'Artisan Mouth-blown Glass Vases, Terrariums & Decorative Jars',
    generalDuty: 6.0,
    chinaSection301: 25.0,
    indiaDuty: 6.0,
    vietnamDuty: 6.0,
    complianceNotes: 'Drop test certified master packaging recommended to prevent maritime transit breakage.'
  }
];

export default function TariffCalculatorPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHts, setSelectedHts] = useState<HtsRecord>(HTS_DATABASE[0]);

  // Calculator Parameters
  const [fobUnitPrice, setFobUnitPrice] = useState<number>(18.50);
  const [quantity, setQuantity] = useState<number>(1200);
  const [retailMsrp, setRetailMsrp] = useState<number>(65.00);

  // Freight & Logistics
  const [containerType, setContainerType] = useState<'20ft' | '40ft' | 'LCL'>('20ft');
  const [oceanFreight, setOceanFreight] = useState<number>(2100);
  const [cargoInsurance, setCargoInsurance] = useState<number>(140);
  const [drayageTrucking, setDrayageTrucking] = useState<number>(450); // US local port-to-warehouse trucking

  // AI Pitch Copy state
  const [copied, setCopied] = useState(false);

  // Filter HTS codes
  const filteredHts = useMemo(() => {
    if (!searchTerm) return HTS_DATABASE;
    const q = searchTerm.toLowerCase();
    return HTS_DATABASE.filter(
      h => h.code.toLowerCase().includes(q) ||
           h.category.toLowerCase().includes(q) ||
           h.description.toLowerCase().includes(q)
    );
  }, [searchTerm]);

  // Landed Cost Calculations
  const landedStats = useMemo(() => {
    const totalFob = fobUnitPrice * quantity;
    const dutyRate = selectedHts.indiaDuty / 100;
    const customsDutyAmount = totalFob * dutyRate;

    // US Customs Merchandise Processing Fee (MPF): 0.3464% of FOB value (min $31.67, max $614.35)
    const rawMpf = totalFob * 0.003464;
    const mpf = Math.min(614.35, Math.max(31.67, rawMpf));

    // US Customs Harbor Maintenance Fee (HMF): 0.125% of commercial cargo value
    const hmf = totalFob * 0.00125;

    // Total Freight & Logistics
    const totalLogistics = oceanFreight + cargoInsurance + drayageTrucking;

    // Grand Landed Total
    const totalLandedCost = totalFob + customsDutyAmount + mpf + hmf + totalLogistics;
    const landedCostPerUnit = totalLandedCost / Math.max(1, quantity);

    // Landed cost markup over FOB
    const landedMultiplier = (landedCostPerUnit / Math.max(0.01, fobUnitPrice));
    const landedMarkupPercent = ((landedMultiplier - 1) * 100).toFixed(1);

    // Retailer Gross Margin: (MSRP - Landed Cost) / MSRP * 100
    const buyerGrossMarginPercent = Math.max(0, ((retailMsrp - landedCostPerUnit) / Math.max(1, retailMsrp)) * 100);
    const buyerGrossProfitPerUnit = Math.max(0, retailMsrp - landedCostPerUnit);

    // China Comparison (with Section 301 25% extra tariff)
    const chinaTotalDutyRate = (selectedHts.generalDuty + selectedHts.chinaSection301) / 100;
    const chinaDutyAmount = totalFob * chinaTotalDutyRate;
    const chinaTotalLanded = totalFob + chinaDutyAmount + mpf + hmf + totalLogistics;
    const chinaLandedUnit = chinaTotalLanded / Math.max(1, quantity);
    const tariffSavings = chinaDutyAmount - customsDutyAmount;

    return {
      totalFob,
      customsDutyAmount,
      mpf,
      hmf,
      totalLogistics,
      totalLandedCost,
      landedCostPerUnit: parseFloat(landedCostPerUnit.toFixed(2)),
      landedMultiplier: parseFloat(landedMultiplier.toFixed(2)),
      landedMarkupPercent,
      buyerGrossMarginPercent: parseFloat(buyerGrossMarginPercent.toFixed(1)),
      buyerGrossProfitPerUnit: parseFloat(buyerGrossProfitPerUnit.toFixed(2)),
      chinaDutyAmount,
      chinaLandedUnit: parseFloat(chinaLandedUnit.toFixed(2)),
      tariffSavings: parseFloat(tariffSavings.toFixed(2))
    };
  }, [fobUnitPrice, quantity, retailMsrp, selectedHts, oceanFreight, cargoInsurance, drayageTrucking]);

  const buyerPitchText = useMemo(() => {
    return (
      `Dear Sourcing Director,\n\n` +
      `To simplify your purchasing evaluation, we have pre-modeled your estimated US Landed DDP Cost for our ${selectedHts.category} (${selectedHts.code}):\n\n` +
      `• FOB Price: $${fobUnitPrice.toFixed(2)} / unit\n` +
      `• Estimated US Landed Cost (LA/Long Beach): $${landedStats.landedCostPerUnit.toFixed(2)} / unit\n` +
      `  (Includes US Customs Duty at ${selectedHts.indiaDuty}%, Ocean Freight, MPF, HMF & local port drayage)\n` +
      `• Projected Retail Margin: ${landedStats.buyerGrossMarginPercent}% gross margin at $${retailMsrp.toFixed(2)} MSRP ($${landedStats.buyerGrossProfitPerUnit.toFixed(2)} gross profit/unit)\n` +
      `• China Tariff Arbitrage: Sourcing from our certified facility in India eliminates 25% Section 301 tariffs, saving your company ~$${landedStats.tariffSavings.toLocaleString()} on this shipment alone.\n\n` +
      `We have drop-test certified master packaging and full export documentation ready. Would you like to review sample pieces next week?\n\n` +
      `Best regards,\n` +
      `Export Sales Team`
    );
  }, [selectedHts, fobUnitPrice, retailMsrp, landedStats]);

  const handleCopyPitch = () => {
    navigator.clipboard.writeText(buyerPitchText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-dark-900 border border-dark-800 p-5 rounded-2xl">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary-600/20 border border-primary-500/30 flex items-center justify-center text-primary-400">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-dark-50">US Customs Tariff & Landed Cost Intelligence</h1>
            <p className="text-xs text-dark-400">Calculate US Harmonized Tariff Schedule (HTS) duty rates, harbor fees, landed costs & China tariff savings</p>
          </div>
        </div>

        <button
          onClick={handleCopyPitch}
          className="btn btn-primary text-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> : <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
          {copied ? 'Pitch Copied!' : 'Copy AI Landed Margin Pitch'}
        </button>
      </div>

      {/* Top 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* FOB vs Landed Cost */}
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-4">
          <div className="text-xs text-dark-400 flex items-center justify-between">
            <span>Estimated US Landed Cost</span>
            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              +{landedStats.landedMarkupPercent}% over FOB
            </span>
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
            ${landedStats.landedCostPerUnit} <span className="text-xs font-normal text-dark-400">/ unit</span>
          </div>
          <div className="text-[11px] text-dark-400 mt-1">
            Base FOB: <strong className="text-dark-200">${fobUnitPrice.toFixed(2)}</strong> | Duty: {selectedHts.indiaDuty}%
          </div>
        </div>

        {/* Retailer Gross Margin */}
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-4">
          <div className="text-xs text-dark-400 flex items-center justify-between">
            <span>Buyer's Retail Margin</span>
            <span className="text-[10px] font-semibold text-primary-400 bg-primary-500/10 px-1.5 py-0.5 rounded">
              High Incentive
            </span>
          </div>
          <div className="text-2xl font-bold text-primary-400 font-mono mt-1">
            {landedStats.buyerGrossMarginPercent}%
          </div>
          <div className="text-[11px] text-dark-400 mt-1">
            Buyer profits <strong className="text-dark-200">${landedStats.buyerGrossProfitPerUnit}</strong> / unit at ${retailMsrp} MSRP
          </div>
        </div>

        {/* Total Shipment Landed Cost */}
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-4">
          <div className="text-xs text-dark-400 flex items-center justify-between">
            <span>Total Landed Shipment</span>
            <span className="text-[10px] font-mono text-dark-500">{quantity} units</span>
          </div>
          <div className="text-2xl font-bold text-dark-50 font-mono mt-1">
            ${landedStats.totalLandedCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-dark-400 mt-1">
            FOB Cargo: ${(landedStats.totalFob).toLocaleString()} + Freight/Duty
          </div>
        </div>

        {/* China Tariff Savings */}
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-4 bg-gradient-to-br from-dark-900 via-dark-900 to-amber-950/20">
          <div className="text-xs text-amber-400 flex items-center justify-between">
            <span>China Section 301 Savings</span>
            <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded">
              0% vs 25%
            </span>
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono mt-1">
            ${landedStats.tariffSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-dark-400 mt-1">
            India duty advantage vs 25% China tariff
          </div>
        </div>
      </div>

      {/* Main Grid: Left is HTS Directory, Right is Landed Cost Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: HTS Directory Selector (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-dark-200 uppercase tracking-wider flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-primary-400" /> US HTS Tariff Directory
              </h3>
              <span className="text-[11px] text-dark-500">{HTS_DATABASE.length} Common Categories</span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
              <input
                type="text"
                placeholder="Search HS Code, product or material..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-8 text-xs w-full"
              />
            </div>

            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {filteredHts.map((hts) => {
                const isSelected = selectedHts.code === hts.code;
                return (
                  <div
                    key={hts.code}
                    onClick={() => setSelectedHts(hts)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-primary-950/30 border-primary-500/50 shadow-sm'
                        : 'bg-dark-800/40 border-dark-800 hover:border-dark-700 hover:bg-dark-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-dark-100">{hts.code}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-dark-700 text-dark-300">
                        Duty: {hts.indiaDuty}%
                      </span>
                    </div>
                    <div className="font-medium text-dark-200 mt-1">{hts.category}</div>
                    <div className="text-[11px] text-dark-400 line-clamp-1 mt-0.5">{hts.description}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Compliance & US Regulatory Note for Selected Code */}
          <div className="card p-4 border-l-4 border-l-primary-500 space-y-1.5 bg-dark-900">
            <div className="text-xs font-bold text-primary-300 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-primary-400" /> US Customs Compliance Requirement:
            </div>
            <p className="text-xs text-dark-300 leading-relaxed">
              {selectedHts.complianceNotes}
            </p>
          </div>
        </div>

        {/* RIGHT: Landed Cost Breakdown & Pitch Generator (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Interactive Input Form */}
          <div className="card p-5 space-y-4">
            <h3 className="text-xs font-bold text-dark-200 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-400" /> Commercial Quotation & Freight Inputs
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-dark-400">Unit FOB Price ($ USD)</label>
                <input
                  type="number"
                  step="0.5"
                  value={fobUnitPrice}
                  onChange={(e) => setFobUnitPrice(Number(e.target.value))}
                  className="input text-xs mt-1 font-mono font-bold text-dark-50"
                />
              </div>
              <div>
                <label className="text-xs text-dark-400">Order Quantity (Units)</label>
                <input
                  type="number"
                  step="100"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                  className="input text-xs mt-1 font-mono font-bold text-dark-50"
                />
              </div>
              <div>
                <label className="text-xs text-dark-400">US Target Retail MSRP ($)</label>
                <input
                  type="number"
                  step="1"
                  value={retailMsrp}
                  onChange={(e) => setRetailMsrp(Number(e.target.value))}
                  className="input text-xs mt-1 font-mono font-bold text-emerald-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-dark-800">
              <div>
                <label className="text-xs text-dark-400">Container Freight ($)</label>
                <input
                  type="number"
                  step="100"
                  value={oceanFreight}
                  onChange={(e) => setOceanFreight(Number(e.target.value))}
                  className="input text-xs mt-1 font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-dark-400">Cargo Insurance ($)</label>
                <input
                  type="number"
                  step="10"
                  value={cargoInsurance}
                  onChange={(e) => setCargoInsurance(Number(e.target.value))}
                  className="input text-xs mt-1 font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-dark-400">US Drayage / Trucking ($)</label>
                <input
                  type="number"
                  step="50"
                  value={drayageTrucking}
                  onChange={(e) => setDrayageTrucking(Number(e.target.value))}
                  className="input text-xs mt-1 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Detailed Itemized Landed Cost Table */}
          <div className="card p-5 space-y-3">
            <h3 className="text-xs font-bold text-dark-200 uppercase tracking-wider flex items-center justify-between">
              <span>Itemized US Landed Cost Breakdown</span>
              <span className="text-[11px] font-mono text-dark-500">Per Unit & Total</span>
            </h3>

            <div className="divide-y divide-dark-800 text-xs">
              <div className="py-2.5 flex justify-between items-center text-dark-300">
                <span>1. Factory FOB Value</span>
                <span className="font-mono font-semibold text-dark-100">
                  ${fobUnitPrice.toFixed(2)} / unit (${landedStats.totalFob.toLocaleString()})
                </span>
              </div>

              <div className="py-2.5 flex justify-between items-center text-dark-300">
                <span className="flex items-center gap-1.5">
                  2. US Customs Import Duty ({selectedHts.indiaDuty}%)
                  <span className="text-[10px] text-dark-500">HTS {selectedHts.code}</span>
                </span>
                <span className="font-mono font-semibold text-primary-400">
                  +${(landedStats.customsDutyAmount / quantity).toFixed(2)} / unit (${landedStats.customsDutyAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })})
                </span>
              </div>

              <div className="py-2.5 flex justify-between items-center text-dark-300">
                <span className="flex items-center gap-1.5">
                  3. US Merchandise Processing Fee (MPF)
                  <span className="text-[10px] text-dark-500">0.3464%</span>
                </span>
                <span className="font-mono font-semibold text-dark-300">
                  +${(landedStats.mpf / quantity).toFixed(2)} / unit (${landedStats.mpf.toFixed(2)})
                </span>
              </div>

              <div className="py-2.5 flex justify-between items-center text-dark-300">
                <span className="flex items-center gap-1.5">
                  4. US Harbor Maintenance Fee (HMF)
                  <span className="text-[10px] text-dark-500">0.125%</span>
                </span>
                <span className="font-mono font-semibold text-dark-300">
                  +${(landedStats.hmf / quantity).toFixed(2)} / unit (${landedStats.hmf.toFixed(2)})
                </span>
              </div>

              <div className="py-2.5 flex justify-between items-center text-dark-300">
                <span>5. Ocean Freight, Insurance & Drayage</span>
                <span className="font-mono font-semibold text-dark-300">
                  +${(landedStats.totalLogistics / quantity).toFixed(2)} / unit (${landedStats.totalLogistics.toLocaleString()})
                </span>
              </div>

              {/* Total Row */}
              <div className="py-3 flex justify-between items-center font-bold text-sm bg-dark-800/40 px-3 rounded-lg mt-2">
                <span className="text-dark-50">Estimated Landed Cost to US Warehouse:</span>
                <span className="text-emerald-400 font-mono text-base">
                  ${landedStats.landedCostPerUnit} / unit
                </span>
              </div>
            </div>
          </div>

          {/* AI Buyer Outreach Pitch Box */}
          <div className="card p-5 space-y-3 bg-dark-900 border-primary-500/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" /> Ready-to-Send Buyer Landed Cost Pitch:
              </span>
              <button
                onClick={handleCopyPitch}
                className="text-xs text-primary-400 hover:text-primary-300 font-semibold flex items-center gap-1"
              >
                <Copy className="w-3 h-3" /> {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
            </div>
            <textarea
              readOnly
              value={buyerPitchText}
              rows={8}
              className="input text-xs font-mono bg-dark-950 border-dark-700 w-full text-dark-200 leading-relaxed cursor-pointer"
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

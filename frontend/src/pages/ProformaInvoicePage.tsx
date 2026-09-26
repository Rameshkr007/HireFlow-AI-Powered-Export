import React, { useState, useMemo } from 'react';
import {
  FileText, Calculator, Box, Ship, Printer, Plus, Trash2,
  Sparkles, CheckCircle2, DollarSign, Building, Globe,
  ShieldCheck, AlertCircle, RefreshCw, Send, ArrowRight
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

interface LineItem {
  id: string;
  description: string;
  hsCode: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  itemsPerCarton: number;
  cartonLengthCm: number;
  cartonWidthCm: number;
  cartonHeightCm: number;
  grossWeightKg: number;
}

const DEFAULT_ITEMS: LineItem[] = [
  {
    id: '1',
    description: 'Handcrafted Acacia Wood Decorative Salad Bowl Set (12")',
    hsCode: '4419.90.90',
    quantity: 600,
    unit: 'Sets',
    unitPrice: 14.50,
    itemsPerCarton: 12,
    cartonLengthCm: 50,
    cartonWidthCm: 40,
    cartonHeightCm: 35,
    grossWeightKg: 14.2
  },
  {
    id: '2',
    description: 'Hand-Hammered Antique Brass Pillar Candle Lantern (18")',
    hsCode: '9405.50.40',
    quantity: 400,
    unit: 'Pieces',
    unitPrice: 22.00,
    itemsPerCarton: 8,
    cartonLengthCm: 60,
    cartonWidthCm: 45,
    cartonHeightCm: 40,
    grossWeightKg: 18.5
  },
  {
    id: '3',
    description: 'Braided Organic Jute & Cotton Area Rug (5x8 ft)',
    hsCode: '5702.32.10',
    quantity: 250,
    unit: 'Pieces',
    unitPrice: 38.00,
    itemsPerCarton: 5,
    cartonLengthCm: 80,
    cartonWidthCm: 30,
    cartonHeightCm: 30,
    grossWeightKg: 22.0
  }
];

export default function ProformaInvoicePage() {
  // Invoice Details State
  const [invoiceNo, setInvoiceNo] = useState(`PI-US-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [validityDays, setValidityDays] = useState(30);

  // Exporter Info
  const [exporterName, setExporterName] = useState('Himalayan Artisans & Exports Pvt Ltd');
  const [exporterAddress, setExporterAddress] = useState('Plot 42, Export Promotion Industrial Zone, Phase II, Jaipur, India');
  const [exporterContact, setExporterContact] = useState('exports@himalayanexports.com | +91 141 289 4400');
  const [exporterGstIec, setExporterGstIec] = useState('IEC: 0518099231 | GSTIN: 08AAACH1234F1Z9');

  // Buyer Info
  const [buyerName, setBuyerName] = useState('Sagebrook Home Imports LLC');
  const [buyerAddress, setBuyerAddress] = useState('21100 S. Avalon Blvd, Carson, CA 90745, USA');
  const [buyerContact, setBuyerContact] = useState('procurement@sagebrookhome.com | +1 (323) 720-8881');

  // Trade Shipping Details
  const [incoterm, setIncoterm] = useState('FOB');
  const [portOfLoading, setPortOfLoading] = useState('Mundra Port / Nhava Sheva (INMUN / INNSA), India');
  const [portOfDischarge, setPortOfDischarge] = useState('Port of Los Angeles / Long Beach, CA, USA');
  const [paymentTerms, setPaymentTerms] = useState('30% Advance T/T, 70% against Scanned Bill of Lading (B/L)');
  const [productionLeadTime, setProductionLeadTime] = useState('35 - 40 Days after deposit');

  // Costs
  const [freightCost, setFreightCost] = useState(1850);
  const [insuranceCost, setInsuranceCost] = useState(120);
  const [currency, setCurrency] = useState('USD');

  // Bank Details
  const [bankName, setBankName] = useState('Standard Chartered Bank / HDFC Bank');
  const [swiftCode, setSwiftCode] = useState('SCBLINBBXXX');
  const [accountNo, setAccountNo] = useState('00291040003892');
  const [beneficiary, setBeneficiary] = useState('Himalayan Artisans & Exports Pvt Ltd');

  // Line Items
  const [items, setItems] = useState<LineItem[]>(DEFAULT_ITEMS);

  // AI Cover Letter
  const [aiNote, setAiNote] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Fetch buyers for auto-fill
  const { data: buyersData } = useQuery({
    queryKey: ['buyers-dropdown'],
    queryFn: async () => {
      const res = await api.get('/api/buyers?limit=50');
      return res.data;
    },
  });

  // CBM & Financial Calculations
  const calculations = useMemo(() => {
    let subtotal = 0;
    let totalCartons = 0;
    let totalCbm = 0;
    let totalGrossWeight = 0;

    items.forEach((item) => {
      const lineTotal = item.quantity * item.unitPrice;
      subtotal += lineTotal;

      const cartons = Math.ceil(item.quantity / Math.max(1, item.itemsPerCarton));
      totalCartons += cartons;

      // CBM per carton = (L x W x H in cm) / 1,000,000
      const cbmPerCarton = (item.cartonLengthCm * item.cartonWidthCm * item.cartonHeightCm) / 1000000;
      totalCbm += cartons * cbmPerCarton;

      totalGrossWeight += cartons * item.grossWeightKg;
    });

    const isCifOrDdp = incoterm === 'CIF' || incoterm === 'DDP';
    const applicableFreight = isCifOrDdp ? freightCost : 0;
    const applicableInsurance = isCifOrDdp ? insuranceCost : 0;
    const grandTotal = subtotal + applicableFreight + applicableInsurance;

    // Container Capacities (approx standard ocean freight)
    // 20ft container: 28 CBM, max payload ~21,500 kg
    // 40ft container: 58 CBM, max payload ~26,500 kg
    // 40ft HQ: 68 CBM, max payload ~26,500 kg
    const util20ft = Math.min(100, Math.round((totalCbm / 28) * 100));
    const util40ft = Math.min(100, Math.round((totalCbm / 58) * 100));
    const util40hq = Math.min(100, Math.round((totalCbm / 68) * 100));

    let recommendedContainer = "20' Standard FCL Container";
    let containerBadge = "Ideal for 20ft FCL";
    let containerBadgeColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";

    if (totalCbm > 58) {
      recommendedContainer = "40' High Cube (HQ) Container";
      containerBadge = "Requires 40' HQ Container";
      containerBadgeColor = "text-purple-400 bg-purple-500/10 border-purple-500/20";
    } else if (totalCbm > 28) {
      recommendedContainer = "40' Standard FCL Container";
      containerBadge = "Requires 40' FCL Container";
      containerBadgeColor = "text-cyan-400 bg-cyan-500/10 border-cyan-500/20";
    } else if (totalCbm < 12) {
      recommendedContainer = "LCL (Less than Container Load) Consolidated";
      containerBadge = "Small Load (LCL / Shared)";
      containerBadgeColor = "text-amber-400 bg-amber-500/10 border-amber-500/20";
    }

    return {
      subtotal,
      applicableFreight,
      applicableInsurance,
      grandTotal,
      totalCartons,
      totalCbm: parseFloat(totalCbm.toFixed(2)),
      totalGrossWeight: parseFloat(totalGrossWeight.toFixed(1)),
      util20ft,
      util40ft,
      util40hq,
      recommendedContainer,
      containerBadge,
      containerBadgeColor
    };
  }, [items, incoterm, freightCost, insuranceCost]);

  // Handlers for line items
  const handleItemChange = (id: string, field: keyof LineItem, val: any) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: val } : item))
    );
  };

  const addItem = () => {
    const newItem: LineItem = {
      id: Date.now().toString(),
      description: 'Handcrafted Product Item',
      hsCode: '9403.60.00',
      quantity: 100,
      unit: 'Pieces',
      unitPrice: 15.00,
      itemsPerCarton: 10,
      cartonLengthCm: 45,
      cartonWidthCm: 35,
      cartonHeightCm: 30,
      grossWeightKg: 12.0
    };
    setItems((prev) => [...prev, newItem]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSelectBuyer = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const bId = Number(e.target.value);
    const selected = buyersData?.buyers?.find((b: any) => b.id === bId);
    if (selected) {
      setBuyerName(selected.company_name || selected.buyer_name || 'Buyer');
      setBuyerAddress(`${selected.country || 'USA'} Wholesale Division`);
      setBuyerContact(`${selected.email || ''} | ${selected.phone || 'Phone upon request'}`);
    }
  };

  const generateAiCoverNote = () => {
    setIsGeneratingAi(true);
    setTimeout(() => {
      setAiNote(
        `Dear Sourcing & Procurement Team at ${buyerName},\n\n` +
        `Thank you for reviewing our export product catalog. Please find attached our formal Proforma Invoice (${invoiceNo}) for your requested order.\n\n` +
        `Summary of Quotation:\n` +
        `• Total Value: $${calculations.grandTotal.toLocaleString()} ${currency} (${incoterm} ${portOfLoading.split(',')[0]})\n` +
        `• Cargo Volume: ${calculations.totalCbm} CBM across ${calculations.totalCartons} export-standard 5-ply cartons\n` +
        `• Recommended Shipping: ${calculations.recommendedContainer} (${calculations.util20ft}% utilization for 20ft)\n` +
        `• Production Lead Time: ${productionLeadTime}\n` +
        `• Payment Terms: ${paymentTerms}\n\n` +
        `All products are manufactured under strict AQL 2.5 quality control standards with barcode stickering, drop-tested master cartons, and fumigation certificates ready.\n\n` +
        `Please confirm the order quantities or advise if you require sample countersigned approval.\n\n` +
        `Best Regards,\n` +
        `${exporterName}\n` +
        `${exporterContact}`
      );
      setIsGeneratingAi(false);
    }, 600);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-dark-900 border border-dark-800 p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary-600/20 border border-primary-500/30 flex items-center justify-center text-primary-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-dark-50">Proforma Invoice & CBM Container Loading Studio</h1>
              <p className="text-xs text-dark-400">Generate legally compliant international trade commercial quotations & calculate 20'/40' container utilization</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={generateAiCoverNote}
            disabled={isGeneratingAi}
            className="btn btn-secondary text-xs flex items-center gap-1.5"
          >
            {isGeneratingAi ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
            AI Cover Email Note
          </button>
          <button
            onClick={handlePrint}
            className="btn btn-primary text-xs flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / Save PDF Invoice
          </button>
        </div>
      </div>

      {/* CBM Container Loading Intelligence Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total CBM */}
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-dark-400 text-xs mb-1">
            <span className="flex items-center gap-1.5"><Box className="w-3.5 h-3.5 text-primary-400" /> Total Cargo Volume</span>
            <span className="text-[11px] font-mono text-dark-500">m³</span>
          </div>
          <div className="text-2xl font-bold text-dark-50 font-mono">
            {calculations.totalCbm} <span className="text-sm font-normal text-dark-400">CBM</span>
          </div>
          <div className="text-xs text-dark-400 mt-1">
            Across <strong className="text-dark-200">{calculations.totalCartons}</strong> master cartons
          </div>
        </div>

        {/* Total Weight */}
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-dark-400 text-xs mb-1">
            <span className="flex items-center gap-1.5"><Ship className="w-3.5 h-3.5 text-cyan-400" /> Gross Cargo Weight</span>
            <span className="text-[11px] font-mono text-dark-500">kg</span>
          </div>
          <div className="text-2xl font-bold text-cyan-400 font-mono">
            {calculations.totalGrossWeight.toLocaleString()} <span className="text-sm font-normal text-dark-400">KG</span>
          </div>
          <div className="text-xs text-dark-400 mt-1">
            Avg {(calculations.totalGrossWeight / Math.max(1, calculations.totalCartons)).toFixed(1)} kg / carton
          </div>
        </div>

        {/* Container Loading Utilization */}
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-dark-400 text-xs mb-1">
            <span>20' FCL Fill Rate</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${calculations.util20ft > 100 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
              {calculations.util20ft}% Full
            </span>
          </div>
          <div className="w-full bg-dark-800 h-2.5 rounded-full overflow-hidden my-2">
            <div
              className={`h-full transition-all duration-500 ${calculations.util20ft > 100 ? 'bg-red-500' : calculations.util20ft > 75 ? 'bg-emerald-500' : 'bg-primary-500'}`}
              style={{ width: `${Math.min(100, calculations.util20ft)}%` }}
            />
          </div>
          <div className="text-[11px] text-dark-400">
            {calculations.util20ft <= 100 ? `${(28 - calculations.totalCbm).toFixed(1)} CBM remaining in 20' FCL` : `Exceeds 20' FCL capacity by ${(calculations.totalCbm - 28).toFixed(1)} CBM`}
          </div>
        </div>

        {/* Recommended Recommendation */}
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="text-xs text-dark-400 mb-1">Optimal Logistics Mode</div>
            <div className="text-sm font-bold text-dark-100 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              {calculations.recommendedContainer}
            </div>
          </div>
          <div className="mt-2">
            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${calculations.containerBadgeColor}`}>
              {calculations.containerBadge}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left is Invoice Form, Right is Live Printable Invoice Document */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Controls & Settings (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-5 print:hidden">
          {/* Quick Buyer Select */}
          {buyersData?.buyers && buyersData.buyers.length > 0 && (
            <div className="card p-4 space-y-2">
              <label className="text-xs font-semibold text-dark-300 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-primary-400" /> Auto-fill from Discovered Buyers:
              </label>
              <select
                onChange={handleSelectBuyer}
                className="input text-xs w-full bg-dark-800 border-dark-700"
              >
                <option value="">-- Choose a buyer from your database --</option>
                {buyersData.buyers.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.company_name} ({b.country || 'USA'}) - {b.buyer_name || 'Procurement'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Trade Terms & Commercial Settings */}
          <div className="card p-5 space-y-4">
            <h3 className="text-xs font-bold text-dark-200 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-primary-400" /> International Trade Parameters
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-dark-400">Proforma No.</label>
                <input
                  type="text"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  className="input text-xs mt-1 font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-dark-400">Invoice Date</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="input text-xs mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-dark-400">Incoterms 2020</label>
                <select
                  value={incoterm}
                  onChange={(e) => setIncoterm(e.target.value)}
                  className="input text-xs mt-1"
                >
                  <option value="FOB">FOB (Free on Board)</option>
                  <option value="CIF">CIF (Cost, Insurance & Freight)</option>
                  <option value="CFR">CFR (Cost & Freight)</option>
                  <option value="EXW">EXW (Ex Works / Factory)</option>
                  <option value="DDP">DDP (Delivered Duty Paid)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-dark-400">Validity Period</label>
                <select
                  value={validityDays}
                  onChange={(e) => setValidityDays(Number(e.target.value))}
                  className="input text-xs mt-1"
                >
                  <option value={15}>15 Days</option>
                  <option value={30}>30 Days (Standard)</option>
                  <option value={60}>60 Days</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-dark-400">Port of Loading (POL)</label>
              <input
                type="text"
                value={portOfLoading}
                onChange={(e) => setPortOfLoading(e.target.value)}
                className="input text-xs mt-1"
              />
            </div>

            <div>
              <label className="text-xs text-dark-400">Port of Discharge (POD) / Destination</label>
              <input
                type="text"
                value={portOfDischarge}
                onChange={(e) => setPortOfDischarge(e.target.value)}
                className="input text-xs mt-1"
              />
            </div>

            <div>
              <label className="text-xs text-dark-400">Payment Terms</label>
              <input
                type="text"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="input text-xs mt-1"
              />
            </div>

            <div>
              <label className="text-xs text-dark-400">Production & Shipping Lead Time</label>
              <input
                type="text"
                value={productionLeadTime}
                onChange={(e) => setProductionLeadTime(e.target.value)}
                className="input text-xs mt-1"
              />
            </div>

            {(incoterm === 'CIF' || incoterm === 'DDP') && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-dark-800/60 rounded-lg border border-dark-700">
                <div>
                  <label className="text-xs text-dark-300">Ocean Freight ($)</label>
                  <input
                    type="number"
                    value={freightCost}
                    onChange={(e) => setFreightCost(Number(e.target.value))}
                    className="input text-xs mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-dark-300">Marine Insurance ($)</label>
                  <input
                    type="number"
                    value={insuranceCost}
                    onChange={(e) => setInsuranceCost(Number(e.target.value))}
                    className="input text-xs mt-1"
                  />
                </div>
              </div>
            )}
          </div>

          {/* AI Cover Email Modal/Box */}
          {aiNote && (
            <div className="card p-4 space-y-2 bg-primary-950/20 border-primary-800/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Ready-to-Send Outreach Cover Note:
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(aiNote);
                    alert("Email note copied to clipboard!");
                  }}
                  className="text-xs text-primary-400 hover:text-primary-300 font-semibold underline"
                >
                  Copy Note
                </button>
              </div>
              <textarea
                value={aiNote}
                onChange={(e) => setAiNote(e.target.value)}
                rows={9}
                className="input text-xs font-mono bg-dark-900 border-dark-700 w-full leading-relaxed"
              />
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Live Authentic Commercial Proforma Invoice (lg:col-span-7) */}
        <div className="lg:col-span-7 bg-white text-gray-900 rounded-2xl shadow-2xl p-6 sm:p-8 font-sans border border-gray-200 print:shadow-none print:border-none print:p-0">
          {/* Document Header */}
          <div className="border-b-2 border-gray-900 pb-5 mb-5">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-gray-950 uppercase">PROFORMA INVOICE</h2>
                <div className="text-xs font-semibold text-gray-600 tracking-wider uppercase mt-0.5">International Commercial Quotation</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-black font-mono text-gray-950">{invoiceNo}</div>
                <div className="text-xs text-gray-600 font-medium">Date: <span className="font-semibold text-gray-900">{invoiceDate}</span></div>
                <div className="text-xs text-emerald-700 font-semibold">Valid: {validityDays} Days from issue</div>
              </div>
            </div>
          </div>

          {/* Exporter & Consignee Details Grid */}
          <div className="grid grid-cols-2 gap-6 text-xs mb-6 pb-5 border-b border-gray-200">
            {/* Exporter / Seller */}
            <div>
              <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Shipper / Exporter:</div>
              <div className="font-black text-gray-900 text-sm">{exporterName}</div>
              <div className="text-gray-700 mt-1 leading-snug">{exporterAddress}</div>
              <div className="text-gray-600 mt-1 font-mono text-[11px]">{exporterContact}</div>
              <div className="text-gray-600 font-mono text-[11px]">{exporterGstIec}</div>
            </div>

            {/* Consignee / Buyer */}
            <div>
              <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Buyer / Consignee:</div>
              <div className="font-black text-gray-900 text-sm">{buyerName}</div>
              <div className="text-gray-700 mt-1 leading-snug">{buyerAddress}</div>
              <div className="text-gray-600 mt-1 font-mono text-[11px]">{buyerContact}</div>
            </div>
          </div>

          {/* Shipment & Logistics Meta Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs mb-6">
            <div>
              <div className="text-[10px] text-gray-500 font-semibold uppercase">Incoterm:</div>
              <div className="font-bold text-gray-900">{incoterm} ({portOfLoading.split('/')[0]})</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 font-semibold uppercase">Discharge Port:</div>
              <div className="font-bold text-gray-900 truncate" title={portOfDischarge}>{portOfDischarge}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 font-semibold uppercase">Est. Volume:</div>
              <div className="font-bold text-blue-800">{calculations.totalCbm} CBM ({calculations.totalCartons} Ctn)</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 font-semibold uppercase">Lead Time:</div>
              <div className="font-bold text-gray-900">{productionLeadTime}</div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-900 text-white font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-2 text-left">#</th>
                  <th className="py-2.5 px-2 text-left">Item Description</th>
                  <th className="py-2.5 px-2 text-center">HS Code</th>
                  <th className="py-2.5 px-2 text-center">Qty</th>
                  <th className="py-2.5 px-2 text-right">Unit Price</th>
                  <th className="py-2.5 px-2 text-right">Total ({currency})</th>
                  <th className="py-2.5 px-2 text-center print:hidden">Del</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50/80">
                    <td className="py-2.5 px-2 font-mono text-gray-500 text-center">{index + 1}</td>
                    <td className="py-2.5 px-2">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                        className="w-full bg-transparent font-medium text-gray-900 focus:outline-none focus:bg-yellow-50/50 rounded px-1"
                      />
                      <div className="text-[10px] text-gray-500 font-mono px-1 flex gap-2">
                        <span>Carton: {item.cartonLengthCm}×{item.cartonWidthCm}×{item.cartonHeightCm}cm</span>
                        <span>•</span>
                        <span>{item.itemsPerCarton} pcs/ctn</span>
                        <span>•</span>
                        <span>{item.grossWeightKg} kg</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <input
                        type="text"
                        value={item.hsCode}
                        onChange={(e) => handleItemChange(item.id, 'hsCode', e.target.value)}
                        className="w-20 font-mono text-center bg-transparent border-b border-dashed border-gray-300 focus:outline-none"
                      />
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(item.id, 'quantity', Math.max(1, Number(e.target.value)))}
                        className="w-16 font-mono text-center bg-transparent border-b border-dashed border-gray-300 focus:outline-none"
                      />
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono">
                      <input
                        type="number"
                        step="0.1"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(item.id, 'unitPrice', Number(e.target.value))}
                        className="w-16 font-mono text-right bg-transparent border-b border-dashed border-gray-300 focus:outline-none"
                      />
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono font-bold text-gray-950">
                      ${(item.quantity * item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-2 text-center print:hidden">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Add Line Item Button */}
            <div className="mt-2.5 print:hidden">
              <button
                onClick={addItem}
                className="text-xs text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Product Line Item
              </button>
            </div>
          </div>

          {/* Totals & Financial Breakdown */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-t-2 border-gray-900 pt-4 mb-6">
            <div className="text-xs text-gray-600 space-y-1.5 max-w-sm">
              <div className="font-bold text-gray-900 uppercase tracking-wide text-[10px]">Payment Terms & Instructions:</div>
              <div>• {paymentTerms}</div>
              <div>• Currency: <strong>USD ($ United States Dollars)</strong></div>
              <div>• Bank: <strong>{bankName}</strong> | SWIFT: <span className="font-mono">{swiftCode}</span></div>
              <div>• A/C No: <span className="font-mono">{accountNo}</span></div>
              <div>• Beneficiary: <strong>{beneficiary}</strong></div>
            </div>

            <div className="w-full sm:w-64 space-y-1.5 text-xs text-right">
              <div className="flex justify-between text-gray-600">
                <span>FOB Subtotal:</span>
                <span className="font-mono font-semibold">${calculations.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>

              {(incoterm === 'CIF' || incoterm === 'DDP') && (
                <>
                  <div className="flex justify-between text-gray-600">
                    <span>Ocean Freight ({incoterm}):</span>
                    <span className="font-mono font-semibold">${calculations.applicableFreight.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Marine Insurance:</span>
                    <span className="font-mono font-semibold">${calculations.applicableInsurance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </>
              )}

              <div className="border-t border-gray-300 pt-2 flex justify-between text-sm font-black text-gray-950">
                <span>TOTAL ({currency}):</span>
                <span className="font-mono text-base text-emerald-700">
                  ${calculations.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-[10px] text-gray-500 italic mt-0.5">
                Prices quoted in USD on {incoterm} terms
              </div>
            </div>
          </div>

          {/* Authorization & Signature Stamp Block */}
          <div className="grid grid-cols-2 gap-8 pt-8 border-t border-gray-200 text-xs">
            <div>
              <div className="text-gray-500 text-[10px] uppercase font-bold mb-8">Confirmed & Accepted by Buyer:</div>
              <div className="border-b border-gray-400 w-44" />
              <div className="text-gray-600 mt-1">Authorized Signatory / Date</div>
            </div>

            <div className="text-right flex flex-col items-end">
              <div className="text-gray-500 text-[10px] uppercase font-bold mb-8">For {exporterName}:</div>
              <div className="border-b border-gray-400 w-44" />
              <div className="text-gray-600 mt-1">Authorized Export Officer / Commercial Seal</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

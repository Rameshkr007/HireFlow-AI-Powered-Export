import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, Sparkles, Download, Send, CheckCircle,
  Plus, Trash2, ShieldCheck, Printer, Eye, Layers
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface ProductItem {
  id: string;
  name: string;
  category: string;
  fobPrice: string;
  moq: string;
  material: string;
  hsCode: string;
  dimensions: string;
}

const DEFAULT_PRODUCTS: ProductItem[] = [
  {
    id: '1',
    name: 'Hand-Hammered Himalayan Singing Bowl (7-Metal Bronze)',
    category: 'Home Wellness & Decor',
    fobPrice: '$18.50 / pc',
    moq: '50 pcs',
    material: 'Bronze Alloy (Copper, Tin, Zinc)',
    hsCode: '9206.00.00',
    dimensions: '14cm dia x 8cm ht, 650g'
  },
  {
    id: '2',
    name: 'Artisanal Ceramic Ribbed Vase (Matte Terracotta Finish)',
    category: 'Vases & Pottery',
    fobPrice: '$12.00 / pc',
    moq: '100 pcs',
    material: 'High-fire Natural Clay',
    hsCode: '6913.90.00',
    dimensions: '22cm ht x 12cm base'
  },
  {
    id: '3',
    name: 'Hand-Woven Natural Jute & Wool Area Rug (Boho Nordic)',
    category: 'Floor Decor & Rugs',
    fobPrice: '$42.00 / pc',
    moq: '25 pcs',
    material: '80% Jute, 20% Organic Wool',
    hsCode: '5702.42.00',
    dimensions: '5ft x 7ft (150cm x 210cm)'
  },
  {
    id: '4',
    name: 'Solid Mango Wood Carved Wall Mirror Panel',
    category: 'Wall Art & Mirrors',
    fobPrice: '$28.00 / pc',
    moq: '40 pcs',
    material: 'Sustainable Mango Wood + Float Glass',
    hsCode: '7009.92.00',
    dimensions: '60cm x 90cm x 3.5cm'
  }
];

export default function LookbookGeneratorPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [companyName, setCompanyName] = useState('Himalayan Heritage Exports');
  const [tagline, setTagline] = useState('Manufacturer & Exporter of Premium Handcrafted Home Decor');
  const [contactEmail, setContactEmail] = useState('exports@himalayanheritage.com');
  const [website, setWebsite] = useState('https://www.himalayanheritage.com');
  const [products, setProducts] = useState<ProductItem[]>(DEFAULT_PRODUCTS);
  const [selectedTheme, setSelectedTheme] = useState<'luxury' | 'minimal' | 'rustic'>('luxury');

  const addProduct = () => {
    const newItem: ProductItem = {
      id: Date.now().toString(),
      name: 'New Export Product Item',
      category: 'Home Decor',
      fobPrice: '$15.00 / pc',
      moq: '50 pcs',
      material: 'Handcrafted',
      hsCode: '9403.89.00',
      dimensions: 'Custom specifications'
    };
    setProducts([...products, newItem]);
  };

  const removeProduct = (id: string) => {
    if (products.length <= 1) {
      showToast('Catalog must contain at least one item', 'error');
      return;
    }
    setProducts(products.filter(p => p.id !== id));
  };

  const updateProduct = (id: string, field: keyof ProductItem, val: string) => {
    setProducts(products.map(p => p.id === id ? { ...p, [field]: val } : p));
  };

  const handleAttachToCampaign = () => {
    showToast('Lookbook successfully compiled and linked to Campaign Outbox', 'success');
    navigate('/campaigns/new', {
      state: {
        lookbookTitle: `${companyName} – 2026 Export Collection`,
        productCount: products.length
      }
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="card bg-gradient-to-r from-dark-800 via-dark-850 to-primary-950/40 p-6 border-primary-500/20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Export Lookbook & Digital Catalog Studio</span>
            </div>
            <h1 className="text-2xl font-bold text-dark-50">Commercial Export Catalog Generator</h1>
            <p className="text-xs text-dark-300 max-w-2xl mt-1">
              Generate branded, US Customs-compliant product catalogues with FOB pricing, MOQ tiers, and HS codes to attach directly to buyer outreach emails.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrint}
              className="btn-secondary text-xs py-2.5 px-3.5 flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" /> Print / Export PDF
            </button>
            <button
              onClick={handleAttachToCampaign}
              className="btn-primary text-xs py-2.5 px-4 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-lg shadow-emerald-500/10"
            >
              <Send className="w-4 h-4" /> Attach to Outreach Campaign
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Editor */}
        <div className="lg:col-span-5 card p-5 space-y-5">
          <h2 className="text-sm font-bold text-dark-100 flex items-center gap-2 border-b border-dark-800 pb-3">
            <BookOpen className="w-4 h-4 text-primary-400" /> Catalog Metadata & Branding
          </h2>

          <div className="space-y-3">
            <div>
              <label className="label text-xs">Exporter / Company Brand</label>
              <input
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                className="input text-xs"
              />
            </div>
            <div>
              <label className="label text-xs">Export Value Proposition / Tagline</label>
              <input
                type="text"
                value={tagline}
                onChange={e => setTagline(e.target.value)}
                className="input text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Official Contact Email</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  className="input text-xs"
                />
              </div>
              <div>
                <label className="label text-xs">Company Website</label>
                <input
                  type="text"
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                  className="input text-xs"
                />
              </div>
            </div>
          </div>

          {/* Product Items Accordion / List */}
          <div className="pt-2 border-t border-dark-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-dark-300 uppercase tracking-wider">Catalog Products ({products.length})</span>
              <button
                onClick={addProduct}
                className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1 text-primary-400"
              >
                <Plus className="w-3.5 h-3.5" /> Add Product
              </button>
            </div>

            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {products.map((p, idx) => (
                <div key={p.id} className="p-3 rounded-xl bg-dark-850 border border-dark-700/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-dark-200">#{idx + 1} Item Specification</span>
                    <button
                      onClick={() => removeProduct(p.id)}
                      className="text-dark-500 hover:text-red-400 transition-colors p-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={p.name}
                    onChange={e => updateProduct(p.id, 'name', e.target.value)}
                    placeholder="Product Name"
                    className="input text-xs"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={p.fobPrice}
                      onChange={e => updateProduct(p.id, 'fobPrice', e.target.value)}
                      placeholder="FOB Price"
                      className="input text-xs"
                    />
                    <input
                      type="text"
                      value={p.moq}
                      onChange={e => updateProduct(p.id, 'moq', e.target.value)}
                      placeholder="Minimum Order (MOQ)"
                      className="input text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={p.hsCode}
                      onChange={e => updateProduct(p.id, 'hsCode', e.target.value)}
                      placeholder="HS Code (US Customs)"
                      className="input text-xs font-mono"
                    />
                    <input
                      type="text"
                      value={p.material}
                      onChange={e => updateProduct(p.id, 'material', e.target.value)}
                      placeholder="Material"
                      className="input text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Lookbook Document Preview */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between text-xs text-dark-400 px-1">
            <span className="flex items-center gap-1.5 font-medium text-dark-200">
              <Eye className="w-4 h-4 text-emerald-400" /> Live Interactive Lookbook Sheet
            </span>
            <span className="font-mono text-emerald-400">Ready for B2B Buyer Dispatch</span>
          </div>

          {/* Printable Luxury Lookbook Container */}
          <div className="rounded-2xl bg-dark-900 border border-dark-700/80 p-8 shadow-2xl text-dark-100 space-y-6">
            {/* Catalog Cover Header */}
            <div className="border-b border-dark-700/80 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="text-[11px] font-mono tracking-widest text-primary-400 uppercase block mb-1">
                  OFFICIAL COMMERCIAL LOOKBOOK • 2026
                </span>
                <h2 className="text-2xl font-extrabold text-white tracking-tight">{companyName}</h2>
                <p className="text-xs text-dark-300 mt-1 max-w-md">{tagline}</p>
              </div>

              <div className="text-right text-xs text-dark-400 space-y-0.5">
                <div>{contactEmail}</div>
                <div className="text-primary-400 font-mono">{website}</div>
                <div className="text-[10px] text-emerald-400">Direct Manufacturer Guarantee</div>
              </div>
            </div>

            {/* Product Grid Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {products.map((item, i) => (
                <div key={item.id} className="p-4 rounded-xl bg-dark-850/80 border border-dark-700/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary-500/10 text-primary-400 uppercase tracking-wider">
                      Item #{i + 1}
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400">{item.fobPrice}</span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-dark-100 leading-snug">{item.name}</h3>
                    <span className="text-[11px] text-dark-400">{item.category}</span>
                  </div>

                  <div className="pt-2 border-t border-dark-700/60 grid grid-cols-2 gap-2 text-[11px] text-dark-300">
                    <div><span className="text-dark-500 block text-[10px]">MOQ:</span>{item.moq}</div>
                    <div><span className="text-dark-500 block text-[10px]">HS Code:</span><span className="font-mono">{item.hsCode}</span></div>
                    <div><span className="text-dark-500 block text-[10px]">Material:</span>{item.material}</div>
                    <div><span className="text-dark-500 block text-[10px]">Dimensions:</span>{item.dimensions}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Export Terms & Compliance Footer */}
            <div className="pt-4 border-t border-dark-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-dark-400">
              <div className="flex items-center gap-2 text-emerald-400 font-medium">
                <ShieldCheck className="w-4 h-4" /> Full US Customs Certification • Phytosanitary & Packaging Compliant
              </div>
              <div className="font-mono text-[11px]">
                Incoterms: FOB / CIF Worldwide
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

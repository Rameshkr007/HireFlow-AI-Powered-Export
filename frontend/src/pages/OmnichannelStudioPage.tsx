import React, { useState, useMemo } from 'react';
import {
  MessageCircle, Linkedin, QrCode, Sparkles, Send, Copy,
  CheckCircle2, ExternalLink, Smartphone, Globe, Building,
  ArrowRight, ShieldCheck, Share2, Layers
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

interface TemplateOption {
  id: string;
  name: string;
  channel: 'whatsapp' | 'linkedin';
  text: string;
}

const DEFAULT_TEMPLATES: TemplateOption[] = [
  {
    id: 'wa-catalog',
    name: 'Quick Wholesale Catalog & FOB Introduction',
    channel: 'whatsapp',
    text: `Hi {{buyer_name}}, this is Raj from Himalayan Artisans & Exports. We manufacture authentic handcrafted {{product}} supplying top US retailers. Thought you might like our 2026 Lookbook with FOB pricing: {{catalog_url}} — let me know if you would like counter-samples shipped to your office!`
  },
  {
    id: 'wa-tradeshow',
    name: 'Post-Trade Show Follow-up (High Point / Las Vegas Market)',
    channel: 'whatsapp',
    text: `Hi {{buyer_name}}, wonderful connecting regarding your decor sourcing at the trade show. Here is our direct factory contact and updated FOB price list for {{product}}: {{catalog_url}}. We have ready production capacity with 35-day turnaround.`
  },
  {
    id: 'li-sourcing',
    name: 'Ultra-Short High-Response InMail (<250 chars)',
    channel: 'linkedin',
    text: `Hi {{buyer_name}} — noticed your team sources artisanal {{product}} for {{company_name}}. Our certified Indian facility offers 0% Section 301 tariff exposure & AQL 2.5 quality control. Open to reviewing our 2026 FOB lookbook?`
  },
  {
    id: 'li-tariff',
    name: 'China Tariff Arbitrage Angle',
    channel: 'linkedin',
    text: `Hi {{buyer_name}}, we help US importers eliminate 25% China tariffs by delivering equivalent handcrafted {{product}} directly from India with 30-day lead times. Would you be open to comparing our FOB landed cost model for {{company_name}}?`
  }
];

export default function OmnichannelStudioPage() {
  const [selectedChannel, setSelectedChannel] = useState<'whatsapp' | 'linkedin'>('whatsapp');
  const [buyerName, setBuyerName] = useState('Michael Johnson');
  const [companyName, setCompanyName] = useState('Global Wellness Imports');
  const [phoneNumber, setPhoneNumber] = useState('+13237208881');
  const [productName, setProductName] = useState('Singing Bowls & Home Decor');
  const [catalogUrl, setCatalogUrl] = useState('https://hireflow.export/lookbook/catalog-2026');
  const [messageBody, setMessageBody] = useState(DEFAULT_TEMPLATES[0].text);
  const [copied, setCopied] = useState(false);

  // Fetch buyers from user database
  const { data: buyersData } = useQuery({
    queryKey: ['buyers-omnichannel'],
    queryFn: async () => {
      const res = await api.get('/api/buyers?limit=50');
      return res.data;
    }
  });

  // Interpolated Message
  const finalMessage = useMemo(() => {
    return messageBody
      .replace(/{{buyer_name}}/g, buyerName || 'Buyer')
      .replace(/{{company_name}}/g, companyName || 'your company')
      .replace(/{{product}}/g, productName || 'our products')
      .replace(/{{catalog_url}}/g, catalogUrl || '');
  }, [messageBody, buyerName, companyName, productName, catalogUrl]);

  // WhatsApp Link
  const whatsappUrl = useMemo(() => {
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    const encodedText = encodeURIComponent(finalMessage);
    return `https://wa.me/${cleanPhone}?text=${encodedText}`;
  }, [phoneNumber, finalMessage]);

  // QR Code URL (using public qr server api for crisp vector rendering)
  const qrCodeImgUrl = useMemo(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(whatsappUrl)}&bgcolor=111827&color=10b981&margin=10`;
  }, [whatsappUrl]);

  // Character Count & LinkedIn Response Probability
  const charCount = finalMessage.length;
  const inmailScore = useMemo(() => {
    if (charCount < 300) return { label: 'High Response Rate (~48%)', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    if (charCount < 600) return { label: 'Average Response Rate (~28%)', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    return { label: 'Low Response Rate (<14% - Too Long)', color: 'text-red-400 bg-red-500/20 border-red-500/30' };
  }, [charCount]);

  const handleSelectBuyer = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const bId = Number(e.target.value);
    const selected = buyersData?.buyers?.find((b: any) => b.id === bId);
    if (selected) {
      setBuyerName(selected.buyer_name || 'Buyer');
      setCompanyName(selected.company_name || 'Company');
      if (selected.phone) setPhoneNumber(selected.phone);
      if (selected.product) setProductName(selected.product);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(finalMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-dark-900 border border-dark-800 p-5 rounded-2xl">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary-600/20 border border-primary-500/30 flex items-center justify-center text-primary-400">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-dark-50">Omnichannel WhatsApp & LinkedIn Export Outreach Studio</h1>
            <p className="text-xs text-dark-400">Instant WhatsApp direct message links, QR code scan generator & ultra-short LinkedIn InMail pitch optimizer</p>
          </div>
        </div>

        {/* Channel Switcher */}
        <div className="flex items-center gap-1.5 bg-dark-800 p-1 rounded-xl border border-dark-700">
          <button
            onClick={() => { setSelectedChannel('whatsapp'); setMessageBody(DEFAULT_TEMPLATES[0].text); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              selectedChannel === 'whatsapp'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-dark-400 hover:text-dark-200'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp Studio
          </button>
          <button
            onClick={() => { setSelectedChannel('linkedin'); setMessageBody(DEFAULT_TEMPLATES[2].text); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              selectedChannel === 'linkedin'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-dark-400 hover:text-dark-200'
            }`}
          >
            <Linkedin className="w-3.5 h-3.5" /> LinkedIn InMail
          </button>
        </div>
      </div>

      {/* Main Grid: Left is Configuration & Templates, Right is Interactive Live Device Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Controls & Parameters (lg:col-span-6) */}
        <div className="lg:col-span-6 space-y-4">
          {/* Quick Buyer Select */}
          {buyersData?.buyers && buyersData.buyers.length > 0 && (
            <div className="card p-4 space-y-2">
              <label className="text-xs font-semibold text-dark-300 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-primary-400" /> Auto-fill Lead Details:
              </label>
              <select
                onChange={handleSelectBuyer}
                className="input text-xs w-full bg-dark-800 border-dark-700"
              >
                <option value="">-- Choose lead from your database --</option>
                {buyersData.buyers.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.buyer_name || 'Buyer'} - {b.company_name} ({b.country || 'USA'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Recipient Parameters */}
          <div className="card p-5 space-y-3">
            <h3 className="text-xs font-bold text-dark-200 uppercase tracking-wider flex items-center gap-1.5">
              <Building className="w-4 h-4 text-primary-400" /> Contact & Merge Variables
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-dark-400">Buyer Name</label>
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="input text-xs mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-dark-400">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="input text-xs mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-dark-400">Phone Number (with Country Code)</label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1 (323) 720-8881"
                  className="input text-xs mt-1 font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-dark-400">Product Line Pitch</label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="input text-xs mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-dark-400">Digital Catalog / Lookbook Link</label>
              <input
                type="text"
                value={catalogUrl}
                onChange={(e) => setCatalogUrl(e.target.value)}
                className="input text-xs mt-1 font-mono text-dark-300"
              />
            </div>
          </div>

          {/* High-Converting Template Vault */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-dark-200 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> High-Converting Templates
              </h3>
              <span className="text-[10px] text-dark-500">Click to load</span>
            </div>

            <div className="space-y-2">
              {DEFAULT_TEMPLATES.filter(t => t.channel === selectedChannel).map((tmpl) => (
                <div
                  key={tmpl.id}
                  onClick={() => setMessageBody(tmpl.text)}
                  className="p-3 rounded-xl bg-dark-800/40 border border-dark-800 hover:border-dark-700 cursor-pointer text-xs transition-all hover:bg-dark-800"
                >
                  <div className="font-semibold text-dark-100">{tmpl.name}</div>
                  <div className="text-[11px] text-dark-400 mt-1 line-clamp-2 leading-relaxed">
                    {tmpl.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Interactive Device Preview & Action (lg:col-span-6) */}
        <div className="lg:col-span-6 space-y-4">
          {/* Action Card */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedChannel === 'whatsapp' ? (
                  <MessageCircle className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Linkedin className="w-5 h-5 text-blue-400" />
                )}
                <div>
                  <h3 className="font-bold text-dark-50 text-sm">
                    {selectedChannel === 'whatsapp' ? 'WhatsApp Direct Action' : 'LinkedIn InMail Copy'}
                  </h3>
                  <div className="text-[11px] text-dark-400">
                    {selectedChannel === 'whatsapp' ? `Direct chat ready for ${phoneNumber}` : `${charCount} characters`}
                  </div>
                </div>
              </div>

              {selectedChannel === 'linkedin' && (
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${inmailScore.color}`}>
                  {inmailScore.label}
                </span>
              )}
            </div>

            {/* Editable Preview */}
            <div>
              <label className="text-xs text-dark-400 mb-1 block">Live Message Preview:</label>
              <textarea
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                rows={5}
                className="input text-xs font-mono bg-dark-950 border-dark-700 w-full text-dark-100 leading-relaxed"
              />
            </div>

            {/* Interpolated Final Text Box */}
            <div className="p-3.5 bg-dark-800/80 rounded-xl border border-dark-700 text-xs text-dark-200 leading-relaxed">
              <span className="text-[10px] text-dark-500 font-bold block uppercase tracking-wide mb-1">
                Resolved Message (With Variables Filled):
              </span>
              {finalMessage}
            </div>

            {/* Launch Buttons */}
            <div className="flex items-center gap-3 pt-2">
              {selectedChannel === 'whatsapp' ? (
                <>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary text-xs flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500"
                  >
                    <MessageCircle className="w-4 h-4" /> Open WhatsApp Chat
                  </a>
                  <button
                    onClick={handleCopy}
                    className="btn btn-secondary text-xs flex items-center gap-1.5"
                  >
                    {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy Text'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleCopy}
                    className="btn btn-primary text-xs flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500"
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'InMail Text Copied!' : 'Copy InMail Pitch'}
                  </button>
                  <a
                    href="https://www.linkedin.com/messaging"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary text-xs flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open LinkedIn
                  </a>
                </>
              )}
            </div>
          </div>

          {/* QR Code Scan Card for WhatsApp Trade Shows */}
          {selectedChannel === 'whatsapp' && (
            <div className="card p-5 bg-dark-900 border-dark-800 flex flex-col sm:flex-row items-center gap-5">
              <div className="p-2 bg-dark-950 rounded-xl border border-dark-700 flex-shrink-0">
                <img
                  src={qrCodeImgUrl}
                  alt="WhatsApp Outreach QR Code"
                  className="w-32 h-32 rounded-lg"
                />
              </div>

              <div className="space-y-1.5 text-xs text-center sm:text-left">
                <span className="font-bold text-dark-50 text-sm flex items-center justify-center sm:justify-start gap-1.5">
                  <QrCode className="w-4 h-4 text-emerald-400" /> Trade Show Instant Scan QR
                </span>
                <p className="text-dark-400 leading-relaxed text-[11px]">
                  When meeting US buyers at trade exhibitions (IHGF Delhi Fair, High Point Market, Ambiente), have them scan this QR code. It will instantly launch a pre-addressed WhatsApp message with your 2026 Lookbook attached!
                </p>
                <div className="pt-1">
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-mono font-medium">
                    Pre-linked to {phoneNumber}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

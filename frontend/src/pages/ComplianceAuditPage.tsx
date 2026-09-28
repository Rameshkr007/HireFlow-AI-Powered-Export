import React, { useState, useMemo } from 'react';
import {
  ShieldCheck, Award, CheckCircle2, AlertTriangle, Printer,
  FileCheck, Building, Sparkles, HelpCircle, ArrowRight,
  Download, Globe, Layers, CheckSquare, Square
} from 'lucide-react';

interface AuditRequirement {
  id: string;
  category: string;
  title: string;
  usRegulation: string;
  description: string;
  importance: 'Mandatory' | 'High' | 'Preferred';
  points: number;
}

const AUDIT_REQUIREMENTS: AuditRequirement[] = [
  {
    id: 'prop65',
    category: 'Chemical Safety',
    title: 'California Proposition 65 Lead & Phthalates Testing',
    usRegulation: 'Safe Drinking Water and Toxic Enforcement Act 1986',
    description: 'Third-party lab test reports verifying total lead content < 100 ppm and cadmium/phthalates below California maximum allowable dose levels.',
    importance: 'Mandatory',
    points: 20
  },
  {
    id: 'lacey',
    category: 'Timber & Plant',
    title: 'USDA Lacey Act Botanical Declaration',
    usRegulation: '16 U.S.C. §§ 3371-3378',
    description: 'Documentation certifying legal harvest of timber with exact scientific botanical genus, species name, and country of forest origin.',
    importance: 'Mandatory',
    points: 20
  },
  {
    id: 'cpsc_flam',
    category: 'Textiles & Rugs',
    title: 'US CPSC 16 CFR Part 1630/1631 Flammability Certification',
    usRegulation: 'Consumer Product Safety Act',
    description: 'Pill test / flammability compliance verification for handwoven jute, wool, and cotton carpets and large area rugs.',
    importance: 'Mandatory',
    points: 15
  },
  {
    id: 'fda_leach',
    category: 'Tableware & Food Contact',
    title: 'FDA Food Contact Surface & Heavy Metal Leaching',
    usRegulation: 'FDA Compliance Policy Guide CPG 7117.06/07',
    description: 'For ceramic, wooden, or brass platters and salad bowls: certified food-safe non-toxic finishes with zero heavy metal migration.',
    importance: 'Mandatory',
    points: 15
  },
  {
    id: 'sedex_audit',
    category: 'Social Compliance',
    title: 'SMETA / Sedex 4-Pillar or BSCI Social Audit',
    usRegulation: 'US Retail Corporate Social Responsibility (CSR)',
    description: 'Independent audit report (SGS, Intertek, Bureau Veritas) verifying fair artisan wages, safe working conditions, and zero child labor.',
    importance: 'High',
    points: 15
  },
  {
    id: 'fsc_cert',
    category: 'Sustainability',
    title: 'FSC Chain of Custody (CoC) Timber Certification',
    usRegulation: 'Forest Stewardship Council Standard',
    description: 'Certification ensuring solid wood components originate from responsibly managed forests with complete track-and-trace audit trail.',
    importance: 'Preferred',
    points: 10
  },
  {
    id: 'ista_drop',
    category: 'Packaging',
    title: 'ISTA-3A Master Carton Drop-Test Certification',
    usRegulation: 'E-commerce & Maritime Transit Protection',
    description: '5-ply corrugated export cartons drop-tested from 36 inches with corner impact protection to eliminate ocean transit breakage.',
    importance: 'Preferred',
    points: 5
  }
];

export default function ComplianceAuditPage() {
  const [checkedIds, setCheckedIds] = useState<string[]>([
    'prop65', 'lacey', 'cpsc_flam', 'ista_drop'
  ]);
  const [exporterName, setExporterName] = useState('Himalayan Artisans & Exports Pvt Ltd');
  const [factoryLocation, setFactoryLocation] = useState('Jaipur & Moradabad Industrial Zone, India');
  const [iecNumber, setIecNumber] = useState('IEC: 0518099231');

  // Toggle item
  const toggleItem = (id: string) => {
    setCheckedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Calculations
  const auditStats = useMemo(() => {
    let earned = 0;
    const totalPossible = AUDIT_REQUIREMENTS.reduce((sum, r) => sum + r.points, 0);

    AUDIT_REQUIREMENTS.forEach(r => {
      if (checkedIds.includes(r.id)) {
        earned += r.points;
      }
    });

    const score = Math.round((earned / totalPossible) * 100);

    let grade = 'Grade B (Mid-Market Ready)';
    let gradeColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    let retailTier = 'Specialty Wholesale & Regional Importers (Sagebrook Home, IMAX, Uttermost)';

    if (score >= 85) {
      grade = 'Grade A+ (Enterprise Retail-Ready)';
      gradeColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      retailTier = 'Tier-1 Big Box Chains & Department Stores (Target, TJX Companies, HomeGoods, West Elm)';
    } else if (score < 60) {
      grade = 'Grade C (Compliance Gaps Found)';
      gradeColor = 'text-red-400 bg-red-500/20 border-red-500/30';
      retailTier = 'Limited to Independent Boutiques (Action Required Before US Enterprise Onboarding)';
    }

    return {
      earned,
      totalPossible,
      score,
      grade,
      gradeColor,
      retailTier
    };
  }, [checkedIds]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-dark-900 border border-dark-800 p-5 rounded-2xl print:hidden">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary-600/20 border border-primary-500/30 flex items-center justify-center text-primary-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-dark-50">US Retail Compliance & Certification Readiness Shield</h1>
            <p className="text-xs text-dark-400">Audit your factory against California Prop 65, USDA Lacey Act, CPSC, FDA & SMETA/Sedex retailer mandates</p>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="btn btn-primary text-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Printer className="w-3.5 h-3.5" />
          Print Official Readiness Certificate
        </button>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
        {/* Overall Score */}
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-4">
          <div className="text-xs text-dark-400 flex items-center justify-between">
            <span>US Compliance Readiness Index</span>
            <span className="text-[10px] font-mono text-dark-500">{auditStats.earned} / {auditStats.totalPossible} pts</span>
          </div>
          <div className="text-3xl font-black font-mono text-dark-50 mt-1">
            {auditStats.score}%
          </div>
          <div className="w-full bg-dark-800 h-2 rounded-full overflow-hidden mt-2">
            <div
              className={`h-full ${auditStats.score >= 85 ? 'bg-emerald-500' : auditStats.score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${auditStats.score}%` }}
            />
          </div>
        </div>

        {/* Readiness Grade */}
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="text-xs text-dark-400">Factory Qualification Grade</div>
          <div>
            <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold border mt-1 ${auditStats.gradeColor}`}>
              {auditStats.grade}
            </span>
          </div>
          <div className="text-[11px] text-dark-400 mt-1">
            Based on active US Customs & consumer safety statutes
          </div>
        </div>

        {/* Eligible Retail Tier */}
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="text-xs text-dark-400">Eligible Retail Buyers Tier</div>
          <div className="text-xs font-semibold text-dark-100 line-clamp-2 mt-1">
            {auditStats.retailTier}
          </div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1 font-mono">
            <CheckCircle2 className="w-3 h-3" /> Ready for US Purchase Orders
          </div>
        </div>
      </div>

      {/* Main Grid: Left is Interactive Checklist, Right is Printable Formal Certificate */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Checklist (lg:col-span-6) */}
        <div className="lg:col-span-6 space-y-4 print:hidden">
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-dark-200 uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-primary-400" /> Mandatory & Preferred US Certifications
              </h3>
              <span className="text-[11px] text-dark-400">Check all active files</span>
            </div>

            <div className="space-y-3">
              {AUDIT_REQUIREMENTS.map((req) => {
                const isChecked = checkedIds.includes(req.id);
                return (
                  <div
                    key={req.id}
                    onClick={() => toggleItem(req.id)}
                    className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      isChecked
                        ? 'bg-primary-950/20 border-primary-500/50'
                        : 'bg-dark-800/40 border-dark-800 hover:border-dark-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 text-primary-400 flex-shrink-0">
                        {isChecked ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <Square className="w-4 h-4 text-dark-600" />}
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-dark-100 text-xs">{req.title}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            req.importance === 'Mandatory' ? 'bg-red-500/20 text-red-400' :
                            req.importance === 'High' ? 'bg-amber-500/20 text-amber-400' : 'bg-dark-700 text-dark-400'
                          }`}>
                            {req.importance}
                          </span>
                        </div>

                        <div className="text-[11px] font-mono text-dark-400">
                          {req.usRegulation}
                        </div>

                        <p className="text-[11px] text-dark-300 leading-relaxed pt-1">
                          {req.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Official Printable Vendor Readiness Certificate (lg:col-span-6) */}
        <div className="lg:col-span-6 bg-white text-gray-900 rounded-2xl shadow-2xl p-6 sm:p-8 font-serif border border-gray-300 print:shadow-none print:border-none print:p-0">
          {/* Decorative Border */}
          <div className="border-4 border-double border-gray-900 p-6 sm:p-8 text-center space-y-6">
            {/* Header Stamp */}
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-emerald-700 text-white flex items-center justify-center font-sans font-black text-xl shadow-lg border-2 border-emerald-900">
                <ShieldCheck className="w-9 h-9" />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-black uppercase tracking-wider text-gray-950 font-sans">
                CERTIFICATE OF EXPORT COMPLIANCE
              </h2>
              <div className="text-xs font-semibold tracking-widest text-emerald-800 uppercase font-sans mt-1">
                US Commercial Retail Vendor Standard Readiness
              </div>
            </div>

            <p className="text-xs text-gray-600 italic font-sans max-w-md mx-auto">
              This official statement certifies that the manufacturing facilities and export product lines of the below named enterprise have been evaluated for compliance with relevant US Customs and Consumer Safety statutes:
            </p>

            {/* Vendor Details */}
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl font-sans text-xs space-y-1">
              <div className="text-base font-black text-gray-900">{exporterName}</div>
              <div className="text-gray-600">{factoryLocation}</div>
              <div className="text-gray-500 font-mono text-[11px]">{iecNumber}</div>
            </div>

            {/* Verified Certifications Table */}
            <div className="text-left font-sans text-xs space-y-2">
              <div className="font-bold text-[10px] text-gray-500 uppercase tracking-wider">
                Audited & Verified Compliant Modules:
              </div>

              <div className="space-y-1.5 divide-y divide-gray-100">
                {AUDIT_REQUIREMENTS.filter(r => checkedIds.includes(r.id)).map(r => (
                  <div key={r.id} className="pt-1.5 flex items-center justify-between text-[11px]">
                    <span className="font-medium text-gray-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      {r.title}
                    </span>
                    <span className="font-mono text-gray-500 text-[10px]">{r.category}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Rating Seal */}
            <div className="pt-4 border-t border-gray-200 flex items-center justify-between font-sans text-xs">
              <div className="text-left">
                <div className="text-[10px] text-gray-500 uppercase font-semibold">Vendor Audit Score:</div>
                <div className="text-xl font-black text-emerald-700 font-mono">{auditStats.score} / 100 ({auditStats.grade.split('(')[0].trim()})</div>
              </div>

              <div className="text-right">
                <div className="text-[10px] text-gray-500 uppercase font-semibold">Issue Date:</div>
                <div className="font-mono font-medium text-gray-800">{new Date().toISOString().split('T')[0]}</div>
              </div>
            </div>

            {/* Signature Block */}
            <div className="pt-8 border-t border-gray-200 grid grid-cols-2 gap-4 font-sans text-xs text-center">
              <div>
                <div className="border-b border-gray-400 w-36 mx-auto mb-1" />
                <div className="text-[10px] text-gray-600 font-semibold uppercase">Chief Quality Officer</div>
              </div>
              <div>
                <div className="border-b border-gray-400 w-36 mx-auto mb-1" />
                <div className="text-[10px] text-gray-600 font-semibold uppercase">Director of International Trade</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Search, Users, Brain, Mail, BarChart3,
  Building2, Settings, Zap, Activity, LogOut, ChevronRight,
  MapPin, BookOpen, Trello, ShieldCheck, FileText, Scale, Anchor, Mic, Clock
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/discovery', label: 'Buyer Discovery', icon: Search },
  { path: '/trade-map', label: 'Trade & Buyer Map', icon: MapPin },
  { path: '/manifest-radar', label: 'US Manifest & BoL Radar', icon: Anchor },
  { path: '/buyers', label: 'Buyers Directory', icon: Users },
  { path: '/ai-classification', label: 'AI Classification', icon: Brain },
  { path: '/deal-pipeline', label: 'Deals Pipeline CRM', icon: Trello },
  { path: '/buyer-simulator', label: 'Buyer Pitch Simulator', icon: Mic },
  { path: '/lookbook', label: 'AI Catalog Studio', icon: BookOpen },
  { path: '/proforma-invoice', label: 'Proforma & CBM Studio', icon: FileText },
  { path: '/tariff-calculator', label: 'US Tariff & Landed Cost', icon: Scale },
  { path: '/campaigns', label: 'Outreach Sequences', icon: Zap },
  { path: '/timezone-engine', label: 'Buyer Timezone Matrix', icon: Clock },
  { path: '/deliverability', label: 'Deliverability Shield', icon: ShieldCheck },
  { path: '/email-activity', label: 'Email Activity', icon: Activity },
  { path: '/reports', label: 'Analytics & Reports', icon: BarChart3 },
  null, // divider
  { path: '/profile', label: 'Company Profile', icon: Building2 },
  { path: '/gmail', label: 'Email Integration', icon: Mail },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="fixed left-0 top-0 h-full w-60 bg-dark-900 border-r border-dark-800 flex flex-col z-30">
      {/* Logo */}
      <div className="p-4 border-b border-dark-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-dark-50 text-base">HireFlow</span>
            <div className="text-xs text-dark-500 -mt-0.5">Export Intelligence</div>
          </div>
        </div>
        {/* Live badge */}
        <div className="mt-3 flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-xs text-emerald-400 font-semibold tracking-wide">LIVE ENTERPRISE</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto">
        {NAV_ITEMS.map((item, i) => {
          if (!item) return <div key={i} className="h-px bg-dark-800 my-2" />;
          const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
          const Icon = item.icon;
          return (
            <Link key={item.path} to={item.path} className={isActive ? 'nav-item-active' : 'nav-item'} style={{marginBottom: '2px', display: 'flex'}}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-50" />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-dark-800">
        <div className="flex items-center gap-2 p-2 rounded-lg bg-dark-800">
          <div className="w-7 h-7 bg-primary-600/20 rounded-full flex items-center justify-center text-xs font-semibold text-primary-400">
            {user?.email?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-dark-200 truncate">{user?.email}</div>
            <div className="text-xs text-dark-500">Exporter</div>
          </div>
          <button onClick={logout} title="Logout" className="text-dark-500 hover:text-red-400 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

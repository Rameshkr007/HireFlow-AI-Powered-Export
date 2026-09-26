import React from 'react';
import { Bell, HelpCircle } from 'lucide-react';

interface Props { title: string; subtitle?: string; }

export default function TopNav({ title, subtitle }: Props) {
  return (
    <div className="h-14 border-b border-dark-800 flex items-center justify-between px-6 bg-dark-900/80 backdrop-blur-sm sticky top-0 z-20">
      <div>
        <h1 className="font-semibold text-dark-100 text-sm">{title}</h1>
        {subtitle && <p className="text-xs text-dark-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        <button className="w-8 h-8 flex items-center justify-center text-dark-500 hover:text-dark-300 hover:bg-dark-800 rounded-lg transition-colors">
          <HelpCircle className="w-4 h-4" />
        </button>
        <button className="w-8 h-8 flex items-center justify-center text-dark-500 hover:text-dark-300 hover:bg-dark-800 rounded-lg transition-colors">
          <Bell className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

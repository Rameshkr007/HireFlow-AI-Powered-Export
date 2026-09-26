import React from 'react';
import { LucideIcon } from 'lucide-react';
interface Props { icon: LucideIcon; title: string; description: string; action?: React.ReactNode; }
export default function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 bg-dark-800 rounded-2xl flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-dark-500" />
      </div>
      <h3 className="text-base font-semibold text-dark-200 mb-2">{title}</h3>
      <p className="text-sm text-dark-500 max-w-sm mb-6">{description}</p>
      {action}
    </div>
  );
}

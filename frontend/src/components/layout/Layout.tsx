import React from 'react';
import Sidebar from './Sidebar';
import TopNav from './TopNav';

interface Props { children: React.ReactNode; title: string; subtitle?: string; }

export default function Layout({ children, title, subtitle }: Props) {
  return (
    <div className="min-h-screen bg-dark-950 flex">
      <Sidebar />
      <div className="ml-60 flex-1 flex flex-col min-w-0">
        <TopNav title={title} subtitle={subtitle} />
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

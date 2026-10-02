import React, { useState } from 'react';
import { Settings, Shield, Zap, Globe } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

export default function SettingsPage() {
  const { showToast } = useToast();
  const [demoMode, setDemoMode] = useState(true);

  const toggleDemo = () => {
    setDemoMode(!demoMode);
    showToast(`Demo mode ${!demoMode ? 'enabled' : 'disabled'}`, 'success');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-dark-50">Settings</h2>

      <div className="card p-6 space-y-8">
        <div>
          <h3 className="section-title flex items-center gap-2 mb-4"><Zap className="w-5 h-5 text-amber-400" /> Application Mode</h3>
          <div className="flex items-center justify-between p-4 bg-dark-800 rounded-xl border border-dark-700">
            <div>
              <div className="font-semibold text-dark-100">Demo Mode</div>
              <div className="text-sm text-dark-400 mt-1">Run the app with simulated AI and Email sending. No API keys required.</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={demoMode} onChange={toggleDemo} />
              <div className="w-11 h-6 bg-dark-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
            </label>
          </div>
        </div>

        <div>
          <h3 className="section-title flex items-center gap-2 mb-4"><Globe className="w-5 h-5 text-blue-400" /> API Configuration</h3>
          <p className="text-sm text-dark-400 mb-4">To run HireFlow in production mode, you must configure the following environment variables in the backend <code>.env</code> file:</p>
          <div className="bg-dark-950 p-4 rounded-lg font-mono text-sm text-dark-300 border border-dark-800 space-y-2">
            <div>TRADEWIND_API_KEY=<span className="text-dark-500">your_tradewind_key (Live BoL & Customs Intel)</span></div>
            <div>TRADEWIND_API_URL=<span className="text-dark-500">https://api.tradewind.com/v1</span></div>
            <div>GEMINI_API_KEY=<span className="text-dark-500">your_gemini_key</span></div>
            <div>SERPAPI_KEY=<span className="text-dark-500">your_serpapi_key</span></div>
            <div>GMAIL_CLIENT_ID=<span className="text-dark-500">your_oauth_client_id</span></div>
            <div>GMAIL_CLIENT_SECRET=<span className="text-dark-500">your_oauth_secret</span></div>
          </div>
        </div>

        <div>
          <h3 className="section-title flex items-center gap-2 mb-4"><Shield className="w-5 h-5 text-green-400" /> System Info</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-dark-800">
              <span className="text-dark-400">Version</span>
              <span className="text-dark-100 font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between py-2 border-b border-dark-800">
              <span className="text-dark-400">API Status</span>
              <span className="text-green-400 font-medium">Online</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

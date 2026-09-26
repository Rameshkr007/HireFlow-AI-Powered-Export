import React from 'react';
import { Mail, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

export default function GmailIntegrationPage() {
  const { showToast } = useToast();
  
  // Fake connection state for demo
  const isConnected = false;

  const handleConnect = () => {
    showToast('In Demo Mode, Gmail connection is simulated. Campaigns will send dummy emails.', 'info');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-dark-50">Gmail Integration</h2>
        <p className="text-dark-400 mt-1">Connect your Google Workspace or Gmail account to send campaigns.</p>
      </div>

      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-amber-400 font-semibold mb-1">DEMO MODE ACTIVE</h4>
          <p className="text-amber-300/80 text-sm">
            You don't need to connect a real Gmail account while in Demo Mode. Campaigns will simulate sending emails without actually delivering them to recipients.
          </p>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#ea4335]/10 flex items-center justify-center">
            <Mail className="w-8 h-8 text-[#ea4335]" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-dark-50 mb-1">Google Workspace / Gmail</h3>
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm font-medium text-dark-300">{isConnected ? 'Connected' : 'Not Connected'}</span>
            </div>
          </div>
          <button onClick={handleConnect} className="btn-primary">
            Connect Gmail
          </button>
        </div>

        <div className="pt-6 border-t border-dark-800 space-y-4">
          <h4 className="font-semibold text-dark-100">Setup Instructions</h4>
          <ol className="list-decimal list-inside space-y-3 text-sm text-dark-300">
            <li>Click the "Connect Gmail" button above.</li>
            <li>You will be redirected to Google's secure login page.</li>
            <li>Select the email account you want to send campaigns from.</li>
            <li>Click "Allow" to grant HireFlow permission to send emails on your behalf.</li>
            <li>You will be redirected back to this page.</li>
          </ol>
          
          <div className="mt-4 p-4 bg-dark-800/50 rounded-lg text-sm text-dark-400 flex gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-dark-500" />
            <p>We only request permission to send emails. We do not read your inbox, delete emails, or access any other Google services.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

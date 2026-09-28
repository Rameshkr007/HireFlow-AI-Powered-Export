import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import BuyerDiscoveryPage from './pages/BuyerDiscoveryPage';
import BuyersPage from './pages/BuyersPage';
import BuyerDetailPage from './pages/BuyerDetailPage';
import AIClassificationPage from './pages/AIClassificationPage';
import CampaignsPage from './pages/CampaignsPage';
import CampaignCreatePage from './pages/CampaignCreatePage';
import CampaignDetailPage from './pages/CampaignDetailPage';
import EmailActivityPage from './pages/EmailActivityPage';
import ReportsPage from './pages/ReportsPage';
import CompanyProfilePage from './pages/CompanyProfilePage';
import GmailIntegrationPage from './pages/GmailIntegrationPage';
import SettingsPage from './pages/SettingsPage';
import TradeMapPage from './pages/TradeMapPage';
import ManifestRadarPage from './pages/ManifestRadarPage';
import BuyerSimulatorPage from './pages/BuyerSimulatorPage';
import LookbookGeneratorPage from './pages/LookbookGeneratorPage';
import DealPipelinePage from './pages/DealPipelinePage';
import DeliverabilityMeterPage from './pages/DeliverabilityMeterPage';
import ProformaInvoicePage from './pages/ProformaInvoicePage';
import TariffCalculatorPage from './pages/TariffCalculatorPage';
import TimezoneEnginePage from './pages/TimezoneEnginePage';
import LoadingSpinner from './components/ui/LoadingSpinner';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } }
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/" element={<ProtectedRoute><Layout title="Dashboard" subtitle="Your export outreach overview"><DashboardPage /></Layout></ProtectedRoute>} />
              <Route path="/discovery" element={<ProtectedRoute><Layout title="Buyer Discovery" subtitle="Find verified international buyers with live US trade intelligence"><BuyerDiscoveryPage /></Layout></ProtectedRoute>} />
              <Route path="/trade-map" element={<ProtectedRoute><Layout title="US Trade & Buyer Map" subtitle="Geographic buyer concentration, major port terminals & logistics intelligence"><TradeMapPage /></Layout></ProtectedRoute>} />
              <Route path="/manifest-radar" element={<ProtectedRoute><Layout title="US Customs Manifest & Bill of Lading (BoL) Radar" subtitle="Analyze verified ocean shipping records, supply chain origins & competitor displacement angles"><ManifestRadarPage /></Layout></ProtectedRoute>} />
              <Route path="/buyers" element={<ProtectedRoute><Layout title="Buyers Directory" subtitle="Manage and segment your buyer database"><BuyersPage /></Layout></ProtectedRoute>} />
              <Route path="/buyers/:id" element={<ProtectedRoute><Layout title="Buyer Detail"><BuyerDetailPage /></Layout></ProtectedRoute>} />
              <Route path="/ai-classification" element={<ProtectedRoute><Layout title="AI Lead Intelligence" subtitle="Classify, score, and prioritize international leads"><AIClassificationPage /></Layout></ProtectedRoute>} />
              <Route path="/deal-pipeline" element={<ProtectedRoute><Layout title="Deals Pipeline & AI Inbox" subtitle="Interactive export CRM and automated email reply sentiment classifier"><DealPipelinePage /></Layout></ProtectedRoute>} />
              <Route path="/buyer-simulator" element={<ProtectedRoute><Layout title="AI Virtual US Buyer Pitch Simulator" subtitle="Practice real-time cold pitching, price negotiation & objection handling"><BuyerSimulatorPage /></Layout></ProtectedRoute>} />
              <Route path="/lookbook" element={<ProtectedRoute><Layout title="AI Export Catalog Studio" subtitle="Generate luxury export lookbooks with HS codes, FOB tiers, and wholesale specifications"><LookbookGeneratorPage /></Layout></ProtectedRoute>} />
              <Route path="/proforma-invoice" element={<ProtectedRoute><Layout title="Proforma Invoice & CBM Studio" subtitle="Generate commercial export quotations and calculate container cargo loading"><ProformaInvoicePage /></Layout></ProtectedRoute>} />
              <Route path="/tariff-calculator" element={<ProtectedRoute><Layout title="US Customs Tariff & Landed Cost Intelligence" subtitle="Calculate US HTS duty rates, harbor maintenance fees & estimated landed costs"><TariffCalculatorPage /></Layout></ProtectedRoute>} />
              <Route path="/timezone-engine" element={<ProtectedRoute><Layout title="Global Buyer Timezone Matrix & Smart Send Engine" subtitle="Real-time US & European office hours monitoring and optimal email dispatch windows"><TimezoneEnginePage /></Layout></ProtectedRoute>} />
              <Route path="/campaigns" element={<ProtectedRoute><Layout title="Outreach Sequences" subtitle="Automated multi-touch export cold outreach campaigns"><CampaignsPage /></Layout></ProtectedRoute>} />
              <Route path="/campaigns/new" element={<ProtectedRoute><Layout title="New Outreach Sequence" subtitle="Build visual cadence steps, AI follow-ups & deliverability guardrails"><CampaignCreatePage /></Layout></ProtectedRoute>} />
              <Route path="/campaigns/:id" element={<ProtectedRoute><Layout title="Campaign Detail"><CampaignDetailPage /></Layout></ProtectedRoute>} />
              <Route path="/deliverability" element={<ProtectedRoute><Layout title="Email Deliverability & Domain Shield" subtitle="SPF, DKIM, DMARC validator and real-time spam keyword scanner"><DeliverabilityMeterPage /></Layout></ProtectedRoute>} />
              <Route path="/email-activity" element={<ProtectedRoute><Layout title="Email Activity" subtitle="Real-time log of outbound export pitches"><EmailActivityPage /></Layout></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><Layout title="Analytics & Export Reports" subtitle="Campaign conversions and buyer response performance"><ReportsPage /></Layout></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Layout title="Exporter Profile" subtitle="Your business profile and product catalog details"><CompanyProfilePage /></Layout></ProtectedRoute>} />
              <Route path="/gmail" element={<ProtectedRoute><Layout title="Email Integration" subtitle="Connect your business email for verified delivery"><GmailIntegrationPage /></Layout></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Layout title="Settings"><SettingsPage /></Layout></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

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
              <Route path="/discovery" element={<ProtectedRoute><Layout title="Buyer Discovery" subtitle="Find international buyers for your products"><BuyerDiscoveryPage /></Layout></ProtectedRoute>} />
              <Route path="/buyers" element={<ProtectedRoute><Layout title="Buyers" subtitle="Manage your buyer database"><BuyersPage /></Layout></ProtectedRoute>} />
              <Route path="/buyers/:id" element={<ProtectedRoute><Layout title="Buyer Detail"><BuyerDetailPage /></Layout></ProtectedRoute>} />
              <Route path="/ai-classification" element={<ProtectedRoute><Layout title="AI Classification" subtitle="Classify and score your leads with AI"><AIClassificationPage /></Layout></ProtectedRoute>} />
              <Route path="/campaigns" element={<ProtectedRoute><Layout title="Campaigns" subtitle="Manage your outreach campaigns"><CampaignsPage /></Layout></ProtectedRoute>} />
              <Route path="/campaigns/new" element={<ProtectedRoute><Layout title="New Campaign" subtitle="Create an outreach campaign"><CampaignCreatePage /></Layout></ProtectedRoute>} />
              <Route path="/campaigns/:id" element={<ProtectedRoute><Layout title="Campaign Detail"><CampaignDetailPage /></Layout></ProtectedRoute>} />
              <Route path="/email-activity" element={<ProtectedRoute><Layout title="Email Activity" subtitle="Track all email activity"><EmailActivityPage /></Layout></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><Layout title="Reports" subtitle="Campaign performance reports"><ReportsPage /></Layout></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Layout title="Company Profile" subtitle="Your exporter profile"><CompanyProfilePage /></Layout></ProtectedRoute>} />
              <Route path="/gmail" element={<ProtectedRoute><Layout title="Gmail Integration" subtitle="Connect your Gmail account"><GmailIntegrationPage /></Layout></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Layout title="Settings"><SettingsPage /></Layout></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

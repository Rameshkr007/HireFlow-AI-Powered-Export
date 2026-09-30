import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Mail, Lock, ArrowRight, Eye, EyeOff, ShieldCheck, CheckCircle2, Sparkles, Building2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export default function LoginPage() {
  const [email, setEmail] = useState('rameshkrthakur1816@gmail.com');
  const [password, setPassword] = useState('admin123');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quickLoading, setQuickLoading] = useState(false);
  const { login, user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { 
      showToast('Please fill in all fields', 'error'); 
      return; 
    }
    setLoading(true);
    try {
      await login(email, password);
      showToast('Welcome back! Signed in successfully.', 'success');
      navigate('/');
    } catch {
      showToast('Invalid email or password. Please verify your credentials.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInstantLoginRamesh = async () => {
    setQuickLoading(true);
    try {
      await login('rameshkrthakur1816@gmail.com', 'admin123');
      showToast('Welcome Ramesh! Logged in to OM Enterprise workspace.', 'success');
      navigate('/');
    } catch {
      showToast('Login attempt failed. Please check network connection.', 'error');
    } finally {
      setQuickLoading(false);
    }
  };

  const handleInstantLoginAdmin = async () => {
    setQuickLoading(true);
    try {
      await login('admin@hireflow.com', 'admin123');
      showToast('Signed in as Admin.', 'success');
      navigate('/');
    } catch {
      showToast('Admin login attempt failed.', 'error');
    } finally {
      setQuickLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] bg-dark-900 border-r border-dark-800 p-10">
        <div>
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-dark-50 tracking-tight">HireFlow</span>
              <div className="text-xs text-primary-400 font-medium">Enterprise Export Platform</div>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-dark-50 mb-4 leading-snug">
            Real Export Outreach & Global Trade Automation
          </h2>
          <p className="text-dark-400 text-sm leading-relaxed mb-6">
            Find verified international buyers, calculate landed tariffs, and execute direct cold pitch campaigns from your authenticated email.
          </p>

          <div className="space-y-3.5 pt-4 border-t border-dark-800">
            {[
              'Direct Outbound Outreach Dispatch (Brevo / SMTP)',
              'US Customs Manifest & Wholesale Importer Radar',
              'Candle Stand & Himalayan Singing Bowls Buyer Hub',
              'Permanent Session Persistence & Auto-Reconnection'
            ].map(f => (
              <div key={f} className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-medium text-dark-300">{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-8 border-t border-dark-800">
          <div className="flex items-center gap-2 text-xs text-dark-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Dedicated private database & secure credential protection</span>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-2">
              <Building2 className="w-3.5 h-3.5" />
              <span>OM Enterprise • Export Workspace</span>
            </div>
            <h1 className="text-2xl font-bold text-dark-50">Sign In to Your Account</h1>
            <p className="text-dark-400 text-sm">Access your buyer database, email campaigns, and analytics</p>
          </div>

          {/* Super 1-Click Instant Login for Ramesh */}
          <div className="bg-gradient-to-r from-emerald-950/40 via-emerald-900/20 to-dark-900 border border-emerald-500/30 rounded-xl p-4 shadow-lg shadow-emerald-950/20">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">Fast Access (Ramesh)</span>
              </div>
              <span className="text-[11px] text-emerald-400/80 font-mono">1-Click Instant</span>
            </div>
            <p className="text-xs text-dark-300 mb-3">
              Directly access your OM Enterprise workspace without typing:
            </p>
            <button
              type="button"
              disabled={quickLoading || loading}
              onClick={handleInstantLoginRamesh}
              className="w-full py-3 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-900/30"
            >
              {quickLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-white" />
                  <span>Instant 1-Click Login (Ramesh Kumar)</span>
                </>
              )}
            </button>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-dark-800 w-full" />
            <span className="bg-dark-950 px-3 text-xs text-dark-500 uppercase tracking-wider">or sign in manually</span>
            <div className="border-t border-dark-800 w-full" />
          </div>

          <form onSubmit={handleSubmit} className="card p-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-dark-300 block mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@company.com or yourname@gmail.com"
                  required
                  autoComplete="username"
                  className="input pl-10"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-dark-300">Password</label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="input pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading || quickLoading}
              className="btn-primary w-full justify-center py-2.5 mt-2 bg-primary-600 hover:bg-primary-500 text-sm font-semibold"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={handleInstantLoginAdmin}
              className="text-xs text-dark-500 hover:text-dark-300 underline underline-offset-4 transition-colors"
            >
              Need test admin preview? 1-Click Login as admin@hireflow.com
            </button>
          </div>

          <p className="text-center text-sm text-dark-400">
            Don't have an account yet?{' '}
            <Link to="/register" className="text-primary-400 hover:text-primary-300 font-semibold">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Mail, Lock, ArrowRight, Eye, EyeOff, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

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

  const handleFillDemo = () => {
    setEmail('admin@hireflow.com');
    setPassword('admin123');
    showToast('Demo credentials filled', 'info');
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
              'Direct SMTP & Gmail Outreach Dispatch',
              'US Customs Manifest & Bill of Lading Radar',
              'AI Lead Classification & Priority Scoring',
              'Proforma Quotation & Landed Cost Intelligence'
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
            <span>256-bit encrypted authentication & credential storage</span>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-dark-50">Sign In to Your Account</h1>
            <p className="text-dark-400 text-sm">Enter your email and password to access the export dashboard</p>
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
              disabled={loading}
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

          {/* Quick Demo Access toggle for testing */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={handleFillDemo}
              className="text-xs text-dark-500 hover:text-dark-300 underline underline-offset-4 transition-colors"
            >
              Need quick demo preview? Click to fill test credentials
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

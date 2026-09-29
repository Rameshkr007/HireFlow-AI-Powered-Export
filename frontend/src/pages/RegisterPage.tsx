import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Mail, Lock, ArrowRight, Eye, EyeOff, User, Building2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export default function RegisterPage() {
  const [exporterName, setExporterName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) { 
      showToast('Please fill in your email and password', 'error'); 
      return; 
    }
    if (password.length < 6) {
      showToast('Password should be at least 6 characters', 'error');
      return;
    }
    if (password !== confirmPassword) { 
      showToast('Passwords do not match', 'error'); 
      return; 
    }
    
    setLoading(true);
    try {
      await register(email, password, exporterName.trim(), companyName.trim());
      showToast('Account created successfully! Welcome to HireFlow.', 'success');
      navigate('/');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Registration failed. Please try a different email.';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
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
            Create Your Real Exporter Account
          </h2>
          <p className="text-dark-400 text-sm leading-relaxed mb-6">
            Join thousands of global exporters who automate buyer discovery, verified outreach sequences, and customs landed cost intelligence.
          </p>

          <div className="space-y-3.5 pt-4 border-t border-dark-800">
            {[
              'Direct Outbound Cold Pitch Engine',
              'Global Verified Importer Directory',
              'Multi-touch Email Follow-up Sequences',
              'Instant Commercial Proforma Generator'
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
            <h1 className="text-2xl font-bold text-dark-50">Create an Account</h1>
            <p className="text-dark-400 text-sm">Sign up with your export business details</p>
          </div>

          <form onSubmit={handleSubmit} className="card p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-dark-300 block mb-1.5">Your Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                  <input
                    type="text"
                    value={exporterName}
                    onChange={e => setExporterName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="input pl-10 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-dark-300 block mb-1.5">Company Name</label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                  <input
                    type="text"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="e.g. Himalayan Exports"
                    className="input pl-10 text-xs"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-dark-300 block mb-1.5">
                Email Address <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                <input
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
              <label className="text-xs font-semibold text-dark-300 block mb-1.5">
                Password <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
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

            <div>
              <label className="text-xs font-semibold text-dark-300 block mb-1.5">
                Confirm Password <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  required
                  className="input pl-10 pr-10"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5 mt-2 bg-primary-600 hover:bg-primary-500 text-sm font-semibold"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-dark-400">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

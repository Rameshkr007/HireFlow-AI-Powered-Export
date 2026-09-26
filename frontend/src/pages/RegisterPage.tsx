import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export default function RegisterPage() {
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
    if (!email || !password || !confirmPassword) { showToast('Please fill in all fields', 'error'); return; }
    if (password !== confirmPassword) { showToast('Passwords do not match', 'error'); return; }
    setLoading(true);
    try {
      await register(email, password);
      navigate('/');
    } catch {
      showToast('Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-96 bg-dark-900 border-r border-dark-800 p-10">
        <div>
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-dark-50">HireFlow</span>
          </div>
          <h2 className="text-3xl font-bold text-dark-50 mb-4 leading-tight">Join HireFlow Today</h2>
          <p className="text-dark-400 text-sm leading-relaxed">Start automating your export outreach with AI-powered tools.</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-dark-50">Create an account</h1>
            <p className="text-dark-400 mt-1 text-sm">Sign up to get started</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" className="input pl-9" />
              </div>
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="input pl-9 pr-9" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                <input type={showPass ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" className="input pl-9 pr-9" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 mt-2">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><span>Sign Up</span><ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="text-center text-sm text-dark-500 mt-6">
            Already have an account? <Link to="/login" className="text-primary-400 hover:text-primary-300">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wifi, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Spinner } from '../components/ui/index';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      const message = err.response?.data?.error?.message || 'Login failed. Please try again.';
      setError(message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-brand-950 to-brand-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-600 rounded-2xl shadow-xl mb-4">
            <Wifi className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">SmartClass</h1>
          <p className="text-slate-400 mt-1 text-sm">Intelligent Classroom Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white/[0.07] backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-1">Sign in</h2>
          <p className="text-slate-400 text-sm mb-6">Enter your credentials to access the platform</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-field">
              <label htmlFor="email" className="label text-slate-300">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                className="input bg-white/10 border-white/20 text-white placeholder-slate-500 focus:ring-brand-400 focus:border-brand-400"
                placeholder="you@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="password" className="label text-slate-300">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="input bg-white/10 border-white/20 text-white placeholder-slate-500 focus:ring-brand-400 focus:border-brand-400 pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              id="login-btn"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-brand-500 hover:bg-brand-400 text-white font-medium rounded-xl
                         transition-colors duration-150 flex items-center justify-center gap-2
                         disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? <><Spinner size="sm" className="text-white" /> Signing in...</> : 'Sign in'}
            </button>
          </form>

          {/* Demo credentials hint */}
          <div className="mt-6 pt-5 border-t border-white/10">
            <p className="text-xs text-slate-500 text-center mb-2">Demo credentials (after seeding)</p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-400 bg-white/5 rounded-lg px-3 py-2">
                <span>Admin</span>
                <span className="font-mono">admin@smartclass.edu / Admin@123</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400 bg-white/5 rounded-lg px-3 py-2">
                <span>Faculty</span>
                <span className="font-mono">priya.sharma@smartclass.edu / Faculty@123</span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          SmartClass v1.0 — Capstone Project
        </p>
      </div>
    </div>
  );
}

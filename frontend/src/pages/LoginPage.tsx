import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Lock, Mail, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('admin@company.com');
  const [password, setPassword] = useState('Password@123');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const demoAccounts = [
    { label: 'Super Admin', email: 'admin@company.com', role: 'Full Enterprise Access', color: 'bg-indigo-600' },
    { label: 'IT Manager', email: 'manager.it@company.com', role: 'Approvals & IT Tasks', color: 'bg-blue-600' },
    { label: 'Finance Controller', email: 'finance.admin@company.com', role: 'Finance Admin', color: 'bg-emerald-600' },
    { label: 'Employee (Rahul)', email: 'employee.rahul@company.com', role: 'Assigned Tasks & Logs', color: 'bg-purple-600' },
    { label: 'Viewer', email: 'viewer@company.com', role: 'Read-only Access', color: 'bg-slate-600' },
  ];

  const handleLoginResult = (user: any) => {
    if (user?.isPlatformAdmin) {
      navigate('/platform/dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const loggedInUser = await login(username.trim(), password);
      handleLoginResult(loggedInUser);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid username or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (email: string) => {
    setUsername(email);
    setPassword('Password@123');
    setError(null);
    setIsLoading(true);
    try {
      const loggedInUser = await login(email, 'Password@123');
      handleLoginResult(loggedInUser);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-indigo-600/15 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white mx-auto shadow-xl shadow-indigo-600/30">
          <Building2 className="w-8 h-8" />
        </div>
        <h2 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Apex Global Solutions
        </h2>
        <p className="mt-1 text-xs text-indigo-400 font-semibold tracking-wider uppercase">
          Important Date & Task Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {error && (
            <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Email Address or Username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button type="submit" className="w-full mt-2" size="lg" isLoading={isLoading} icon={<ArrowRight className="w-4 h-4" />}>
              Sign In to Portal
            </Button>
          </form>

          {/* Quick Demo Role Switcher */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>1-Click Demo Login Personas</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleQuickLogin(acc.email)}
                  disabled={isLoading}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-500/50 transition text-left group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${acc.color}`}></div>
                    <div>
                      <span className="text-xs font-bold text-slate-200 group-hover:text-indigo-300 transition">
                        {acc.label}
                      </span>
                      <span className="text-[10px] text-slate-400 block">{acc.role}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 group-hover:text-indigo-400 transition">
                    Sign in &rarr;
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

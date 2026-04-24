import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Mail, Lock, User, Calendar, Loader2, ArrowRight, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';

export default function AuthPage() {
  const { signIn: signInWithGoogle } = useAuth();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (activeTab === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              dob: dob
            }
          }
        });
        
        if (signUpError) throw signUpError;
        
        if (data.user) {
          await supabase.from('users').insert({
            id: data.user.id,
            email: email,
            display_name: fullName,
            role: 'citizen',
            date_of_birth: dob,
          });
          alert("Account created successfully! You can now login.");
          setActiveTab('login');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: 'anujjha@gmail.com',
        password: 'anujjha'
      });
      if (error) throw error;
    } catch (err: any) {
      setError("Demo account login failed. Please ensure 'anujjha@gmail.com' exists in your Supabase Auth.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 selection:bg-brand-red/30">
      {/* Subtle Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-red/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-brand-emerald/5 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-[#0f0f12] rounded-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] border border-white/[0.05] overflow-hidden relative z-10"
      >
        <div className="p-10">
          <div className="flex flex-col items-center mb-10">
            <div className="w-14 h-14 bg-brand-red/10 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-brand-red/20 shadow-lg shadow-brand-red/5">
              <Shield className="w-7 h-7 text-brand-red" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">RESQNET</h1>
            <p className="text-gray-500 text-[10px] uppercase tracking-[0.3em] font-mono font-bold mt-2">Emergency Response Protocol</p>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-white/[0.02] p-1 rounded-2xl mb-8 border border-white/[0.05]">
            <button 
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ${activeTab === 'login' ? 'bg-white/10 text-white shadow-xl' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Login
            </button>
            <button 
              onClick={() => setActiveTab('register')}
              className={`flex-1 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ${activeTab === 'register' ? 'bg-white/10 text-white shadow-xl' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {activeTab === 'register' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Full Identity Name</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-brand-red transition-colors" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Anuj Kumar"
                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:border-brand-red/50 outline-none transition-all placeholder:text-gray-700"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Date of Birth</label>
                    <div className="relative group">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-brand-red transition-colors" />
                      <input
                        type="date"
                        required
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:border-brand-red/50 outline-none transition-all"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Terminal ID (Email)</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-brand-red transition-colors" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@protocol.sys"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:border-brand-red/50 outline-none transition-all placeholder:text-gray-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Access Key (Password)</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-brand-red transition-colors" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:border-brand-red/50 outline-none transition-all placeholder:text-gray-700"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[10px] font-mono uppercase text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-red hover:bg-red-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-brand-red/10 group mt-4"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  <span className="tracking-[0.1em] text-xs uppercase">{activeTab === 'login' ? 'Initiate Link' : 'Register Identity'}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 flex flex-col gap-4">
            <button
              onClick={fillDemoData}
              disabled={loading}
              className="w-full bg-brand-emerald/10 border border-brand-emerald/20 hover:bg-brand-emerald/20 text-brand-emerald font-bold py-3.5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-sm"
            >
              <Star className="w-4 h-4" />
              <span className="text-[10px] uppercase tracking-[0.2em]">Judges: Authorize Demo Access</span>
            </button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/[0.05]"></div>
              </div>
              <div className="relative flex justify-center text-[8px] uppercase tracking-[0.3em] font-mono">
                <span className="px-3 bg-[#0f0f12] text-gray-700">OAuth Bridge</span>
              </div>
            </div>

            <button
              onClick={() => signInWithGoogle()}
              className="w-full bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-3 transition-all"
            >
              <img src="https://www.google.com/favicon.ico" className="w-4 h-4 grayscale opacity-50" alt="Google" />
              <span className="text-[10px] uppercase tracking-[0.2em]">Sign in with Google</span>
            </button>
          </div>
        </div>

        <div className="bg-black/20 p-4 text-center border-t border-white/[0.05]">
          <p className="text-[8px] text-gray-700 font-mono uppercase tracking-[0.2em]">ResqNet Deployment v4.2 Alpha</p>
        </div>
      </motion.div>
    </div>
  );
}

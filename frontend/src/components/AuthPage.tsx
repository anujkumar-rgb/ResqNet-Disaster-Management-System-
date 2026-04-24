import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Mail, Lock, User, Calendar, Loader2, ArrowRight, Star, UserCheck } from 'lucide-react';
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
          alert("Registration successful! Initiating first-time deployment login...");
          setActiveTab('login');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError(null);
    const demoEmail = 'anujjha@gmail.com';
    const demoPass = 'anujjha';

    try {
      // 1. Try to Sign In
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: demoPass
      });

      if (signInError) {
        // 2. If Sign In fails (invalid credentials), try to Sign Up (create the account)
        console.log("Demo account not found, attempting auto-creation...");
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: demoEmail,
          password: demoPass,
          options: {
            data: { full_name: 'Anuj Jha (System Admin)' }
          }
        });

        if (signUpError) throw new Error("Could not create demo account. Please ensure email confirmation is DISABLED in Supabase Dashboard > Authentication > Providers > Email.");

        if (signUpData.user) {
          // 3. Create the profile as Admin
          await supabase.from('users').insert({
            id: signUpData.user.id,
            email: demoEmail,
            display_name: 'Anuj Jha (System Admin)',
            role: 'admin',
          });
          
          // 4. Try signing in again after creation
          await supabase.auth.signInWithPassword({ email: demoEmail, password: demoPass });
        }
      }
    } catch (err: any) {
      setError(err.message || "Bypass failed. Please create 'anujjha@gmail.com' in Supabase manually.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickJoin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInAnonymously({
        options: { data: { full_name: 'Anonymous Agent' } }
      });
      if (error) throw error;
    } catch (err: any) {
      setError("Guest access requires 'Anonymous' provider to be enabled in Supabase.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 selection:bg-brand-red/30">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-brand-red/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-brand-emerald/5 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-[#0f0f12] rounded-3xl shadow-2xl border border-white/[0.05] overflow-hidden relative z-10"
      >
        <div className="p-10">
          <div className="flex flex-col items-center mb-10 text-center">
            <motion.div 
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="w-16 h-16 bg-brand-red/10 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-brand-red/20 shadow-lg shadow-brand-red/5"
            >
              <Shield className="w-8 h-8 text-brand-red" />
            </motion.div>
            <h1 className="text-3xl font-black text-white tracking-tighter italic">RESQ<span className="text-brand-red">NET</span></h1>
            <p className="text-gray-500 text-[10px] uppercase tracking-[0.4em] font-mono font-bold mt-2 opacity-60">Command Center Alpha</p>
          </div>

          <div className="flex bg-white/[0.02] p-1.5 rounded-2xl mb-8 border border-white/[0.05]">
            <button 
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${activeTab === 'login' ? 'bg-white/10 text-white shadow-xl' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Access
            </button>
            <button 
              onClick={() => setActiveTab('register')}
              className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${activeTab === 'register' ? 'bg-white/10 text-white shadow-xl' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Enlist
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence mode="wait">
              {activeTab === 'register' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Agent Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. John Doe"
                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:border-brand-red/50 outline-none transition-all placeholder:text-gray-700"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">DOB Protocol</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                      <input
                        type="date"
                        required
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:border-brand-red/50 outline-none transition-all"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Terminal ID (Email)</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@protocol.sys"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:border-brand-red/50 outline-none transition-all placeholder:text-gray-700"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Access Key (Password)</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:border-brand-red/50 outline-none transition-all placeholder:text-gray-700"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[10px] font-mono uppercase text-center leading-relaxed">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-red hover:bg-red-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-brand-red/5 group"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  <span className="tracking-[0.2em] text-[11px] uppercase italic">{activeTab === 'login' ? 'Initiate Link' : 'Register Identity'}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 flex flex-col gap-4">
            <button
              onClick={handleDemoLogin}
              disabled={loading}
              className="w-full bg-brand-emerald/5 border border-brand-emerald/20 hover:bg-brand-emerald/10 text-brand-emerald font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all group"
            >
              <Star className="w-4 h-4 animate-pulse" />
              <span className="text-[10px] uppercase tracking-[0.2em]">Judges: Authorize Demo Access</span>
            </button>

            <button
              onClick={handleQuickJoin}
              className="w-full bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] text-gray-400 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all"
            >
              <UserCheck className="w-4 h-4" />
              <span className="text-[10px] uppercase tracking-[0.1em]">Explore as Guest</span>
            </button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/[0.05]"></div>
              </div>
              <div className="relative flex justify-center text-[8px] uppercase tracking-[0.3em] font-mono">
                <span className="px-4 bg-[#0f0f12] text-gray-700 font-bold">Standard Channels</span>
              </div>
            </div>

            <button
              onClick={() => signInWithGoogle()}
              className="w-full bg-white/[0.01] border border-white/[0.05] hover:bg-white/[0.03] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all"
            >
              <img src="https://www.google.com/favicon.ico" className="w-4 h-4 grayscale opacity-40" alt="Google" />
              <span className="text-[10px] uppercase tracking-[0.2em]">OAuth Bridge</span>
            </button>
          </div>
        </div>

        <div className="bg-black/20 p-4 text-center border-t border-white/[0.05]">
          <p className="text-[8px] text-gray-700 font-mono uppercase tracking-[0.2em] font-bold">ResqNet Alpha v4.2.5 • Unified Core</p>
        </div>
      </motion.div>
    </div>
  );
}

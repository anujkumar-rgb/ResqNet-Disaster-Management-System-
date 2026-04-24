import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Mail, Lock, User, Calendar, Loader2, ArrowRight, Star, UserCheck, Activity, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';

export default function AuthPage() {
  const { signIn: signInWithGoogle } = useAuth();
  const [activeTab, setActiveTab] = useState<'quick' | 'login'>('quick');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');

  useEffect(() => {
    async function checkConnection() {
      try {
        const { data, error } = await supabase.from('users').select('id').limit(1);
        if (error && error.code !== 'PGRST116') throw error;
        setDbStatus('online');
      } catch (err) {
        setDbStatus('offline');
        console.error("Supabase Connection Error:", err);
      }
    }
    checkConnection();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (activeTab === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        // QUICK JOIN BYPASS
        const { data, error: guestError } = await supabase.auth.signInAnonymously({
          options: { data: { full_name: fullName || 'Anonymous Citizen', dob } }
        });
        if (guestError) throw guestError;
        if (data.user) {
          await supabase.from('users').insert({
            id: data.user.id,
            email: 'guest@resqnet.sys',
            display_name: fullName || 'Anonymous Citizen',
            role: 'citizen',
            date_of_birth: dob
          });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication sequence failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAdmin = async () => {
    setLoading(true);
    setError(null);
    const demoEmail = 'anujjha@gmail.com';
    const demoPass = 'anujjha';

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: demoEmail, password: demoPass });
      if (signInError) {
        // Auto-create if doesn't exist
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: demoEmail,
          password: demoPass,
          options: { data: { full_name: 'Anuj Jha (System Admin)' } }
        });
        if (signUpError) throw new Error("Auto-creation failed. Check Supabase 'Confirm Email' setting.");
        if (signUpData.user) {
          await supabase.from('users').insert({
            id: signUpData.user.id,
            email: demoEmail,
            display_name: 'Anuj Jha (System Admin)',
            role: 'admin',
          });
          await supabase.auth.signInWithPassword({ email: demoEmail, password: demoPass });
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020203] flex items-center justify-center p-6 selection:bg-brand-red/30 overflow-hidden font-sans">
      {/* Dynamic Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-brand-red/5 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-brand-emerald/5 blur-[150px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-50 mix-blend-overlay"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="max-w-md w-full bg-[#0c0c0e]/80 backdrop-blur-xl rounded-[2.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] border border-white/10 p-1 relative z-10"
      >
        <div className="bg-[#111114] rounded-[2.2rem] p-8 pt-12 border border-white/5">
          {/* Header Section */}
          <div className="flex flex-col items-center mb-10">
            <motion.div 
              whileHover={{ rotate: 90, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="w-20 h-20 bg-gradient-to-br from-brand-red to-red-900 rounded-3xl flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(220,38,38,0.3)]"
            >
              <Shield className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-4xl font-black text-white tracking-tighter italic">RESQ<span className="text-brand-red">NET</span></h1>
            
            {/* Database Status Indicator */}
            <div className="mt-4 flex items-center gap-2 px-3 py-1 bg-black/40 border border-white/5 rounded-full">
              <Activity className={`w-3 h-3 ${dbStatus === 'online' ? 'text-brand-emerald animate-pulse' : dbStatus === 'offline' ? 'text-brand-red' : 'text-gray-500'}`} />
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-500">
                {dbStatus === 'online' ? 'System Optimized • Connected' : dbStatus === 'offline' ? 'Bridge Offline' : 'Syncing Grid...'}
              </span>
            </div>
          </div>

          {/* Tactical Tabs */}
          <div className="grid grid-cols-2 bg-black/40 p-1.5 rounded-2xl mb-8 border border-white/5 relative">
            <button 
              onClick={() => setActiveTab('quick')}
              className={`py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all relative z-10 ${activeTab === 'quick' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Instant Join
            </button>
            <button 
              onClick={() => setActiveTab('login')}
              className={`py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all relative z-10 ${activeTab === 'login' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Admin Link
            </button>
            <motion.div 
              className="absolute inset-y-1.5 bg-white/10 rounded-xl shadow-lg border border-white/5"
              initial={false}
              animate={{ 
                left: activeTab === 'quick' ? '6px' : 'calc(50% + 3px)',
                right: activeTab === 'quick' ? 'calc(50% + 3px)' : '6px'
              }}
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            <AnimatePresence mode="wait">
              {activeTab === 'quick' ? (
                <motion.div 
                  key="quick"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em] ml-1">Responder Name</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-brand-red transition-colors" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="ENTER CALLSIGN"
                        className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:border-brand-red/50 outline-none transition-all placeholder:text-gray-700"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em] ml-1">DOB Verification</label>
                    <div className="relative group">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-brand-red transition-colors" />
                      <input
                        type="date"
                        required
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:border-brand-red/50 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-white/5 hover:bg-white/10 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 border border-white/5 transition-all group"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                      <>
                        <span className="tracking-[0.2em] text-[11px] uppercase italic">Deploy Instant Citizen</span>
                        <UserCheck className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      </>
                    )}
                  </button>
                </motion.div>
              ) : (
                <motion.div 
                  key="login"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em] ml-1">Agency Email</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-brand-red transition-colors" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ADMIN@PROTOCOL.SYS"
                        className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:border-brand-red/50 outline-none transition-all placeholder:text-gray-700"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em] ml-1">Access Key</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-brand-red transition-colors" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:border-brand-red/50 outline-none transition-all placeholder:text-gray-700"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-brand-red hover:bg-red-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-brand-red/10 group"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                      <>
                        <span className="tracking-[0.2em] text-[11px] uppercase italic">Initiate Uplink</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl text-red-500 text-[10px] font-mono uppercase text-center flex items-center justify-center gap-2"
              >
                <AlertCircle className="w-3 h-3" />
                {error}
              </motion.div>
            )}
          </form>

          {/* Demo Section */}
          <div className="mt-10 flex flex-col gap-4">
            <button
              onClick={handleDemoAdmin}
              disabled={loading}
              className="w-full bg-gradient-to-r from-brand-emerald/10 to-brand-emerald/5 border border-brand-emerald/20 hover:border-brand-emerald/40 text-brand-emerald font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all group relative overflow-hidden"
            >
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-brand-emerald/5 opacity-0 group-hover:opacity-100 transition-opacity"
              />
              <Star className="w-4 h-4 relative z-10" />
              <span className="text-[10px] uppercase tracking-[0.2em] relative z-10">JUDGES: AUTHORIZE DEMO ADMIN</span>
            </button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5"></div>
              </div>
              <div className="relative flex justify-center text-[8px] uppercase tracking-[0.4em] font-black">
                <span className="px-4 bg-[#111114] text-gray-700">Multi-Channel Access</span>
              </div>
            </div>

            <button
              onClick={() => signInWithGoogle()}
              className="w-full bg-white/[0.02] border border-white/5 hover:bg-white/5 text-gray-400 font-bold py-4 rounded-2xl flex items-center justify-center gap-4 transition-all"
            >
              <img src="https://www.google.com/favicon.ico" className="w-4 h-4 grayscale opacity-40 group-hover:grayscale-0 transition-all" alt="Google" />
              <span className="text-[10px] uppercase tracking-[0.2em]">OAuth 2.0 Identity Bridge</span>
            </button>
          </div>
        </div>

        <div className="bg-black/20 p-5 text-center border-t border-white/5 flex items-center justify-center gap-4">
          <div className="flex items-center gap-2">
             <CheckCircle2 className="w-3 h-3 text-brand-emerald" />
             <span className="text-[8px] text-gray-600 font-mono font-bold uppercase tracking-widest">Protocol Secured</span>
          </div>
          <div className="w-1 h-1 bg-gray-800 rounded-full"></div>
          <p className="text-[8px] text-gray-700 font-mono uppercase tracking-[0.2em] font-bold">ResqNet Edge v4.3.0</p>
        </div>
      </motion.div>
    </div>
  );
}

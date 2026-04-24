import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Mail, Lock, User, Calendar, Loader2, ArrowRight, UserPlus, LogIn, UserCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserRole } from '../types';
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
            }
          }
        });
        
        if (signUpError) throw signUpError;
        
        if (data.user) {
          const role: UserRole = email === 'anujkumarjha1508@gmail.com' ? 'admin' : 'citizen';
          const { error: profileError } = await supabase.from('users').insert({
            id: data.user.id,
            email: email,
            display_name: fullName,
            role: role,
            date_of_birth: dob,
          });
          
          if (profileError) console.error(profileError);
          
          if (!signUpError) {
            alert("Registration successful! Check email for confirmation or login now.");
            setActiveTab('login');
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInAnonymously({
        options: {
          data: {
            full_name: 'Guest User (Demo)',
          }
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError("Guest access is currently disabled. Please use registration or Google Auth.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-4 selection:bg-brand-red/30">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-red/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-emerald/5 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-[#111114] border border-white/5 rounded-3xl overflow-hidden shadow-2xl relative z-10"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
          <motion.div 
            className="h-full bg-brand-red"
            initial={{ width: '50%' }}
            animate={{ width: activeTab === 'login' ? '50%' : '100%' }}
          />
        </div>

        <div className="p-8 pt-10">
          <div className="flex flex-col items-center mb-10">
            <motion.div 
              whileHover={{ rotate: 5, scale: 1.05 }}
              className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-white/10"
            >
              <Shield className="w-8 h-8 text-brand-red" />
            </motion.div>
            <h1 className="text-2xl font-black text-white tracking-[0.2em] uppercase italic">
              RESQ<span className="text-brand-red">NET</span>
            </h1>
            <p className="text-gray-500 text-[10px] mt-2 uppercase tracking-[0.3em] font-mono font-bold">
              Emergency Command Access
            </p>
          </div>

          <div className="flex bg-black/40 p-1 rounded-xl mb-8 border border-white/5">
            <button 
              onClick={() => setActiveTab('login')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'login' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Login
            </button>
            <button 
              onClick={() => setActiveTab('register')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'register' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Register
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.form 
              key={activeTab}
              initial={{ opacity: 0, x: activeTab === 'login' ? -10 : 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: activeTab === 'login' ? 10 : -10 }}
              onSubmit={handleSubmit} 
              className="space-y-5"
            >
              {activeTab === 'register' && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Agent Full Name</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-brand-red transition-colors" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="ENTER LEGAL NAME"
                        className="w-full bg-black/40 border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:border-brand-red/50 outline-none transition-all font-mono"
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
                        className="w-full bg-black/40 border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:border-brand-red/50 outline-none transition-all font-mono uppercase"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Terminal Address</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-brand-red transition-colors" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="EMAIL@PROTOCOL.SYS"
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:border-brand-red/50 outline-none transition-all font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Encryption Key</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-brand-red transition-colors" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:border-brand-red/50 outline-none transition-all font-mono"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl text-brand-red text-[10px] font-mono uppercase text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-red hover:bg-red-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all group relative overflow-hidden shadow-[0_10px_30px_-10px_rgba(220,38,38,0.5)]"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    <span className="relative tracking-[0.2em] uppercase text-xs">
                      {activeTab === 'login' ? 'Initiate Link' : 'Register Identity'}
                    </span>
                    <ArrowRight className="w-4 h-4 relative group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </motion.form>
          </AnimatePresence>

          <div className="mt-8 flex flex-col gap-4">
            <button
              onClick={handleGuestLogin}
              disabled={loading}
              className="w-full bg-brand-emerald/10 border border-brand-emerald/20 hover:bg-brand-emerald/20 text-brand-emerald font-bold py-3.5 rounded-2xl flex items-center justify-center gap-3 transition-all group"
            >
              <UserCheck className="w-4 h-4" />
              <span className="text-[10px] uppercase tracking-[0.2em]">Explore as Guest (Demo)</span>
            </button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5"></div>
              </div>
              <div className="relative flex justify-center text-[8px] uppercase tracking-[0.3em] font-mono">
                <span className="px-3 bg-[#111114] text-gray-600">Alternative Bridge</span>
              </div>
            </div>

            <button
              onClick={() => signInWithGoogle()}
              className="w-full bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-3 transition-all"
            >
              <img src="https://www.google.com/favicon.ico" className="w-4 h-4 grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100" alt="Google" />
              <span className="text-[10px] uppercase tracking-[0.2em]">Sign in with Google</span>
            </button>
          </div>
        </div>

        <div className="bg-black/40 p-4 flex justify-between items-center border-t border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-emerald animate-pulse" />
            <p className="text-[8px] text-gray-600 font-mono uppercase tracking-[0.2em]">Connected to Global Grid</p>
          </div>
          <p className="text-[8px] text-gray-700 font-mono uppercase tracking-[0.1em]">v4.2.0-Alpha</p>
        </div>
      </motion.div>
    </div>
  );
}

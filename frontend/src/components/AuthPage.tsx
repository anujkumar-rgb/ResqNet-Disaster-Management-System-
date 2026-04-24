import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Mail, Lock, User, Calendar, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserRole } from '../types';

export default function AuthPage() {
  const { signIn: signInWithGoogle } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
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
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        // Sign up
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
          // Profile creation is handled by AuthContext trigger or explicit insert
          const role: UserRole = email === 'anujkumarjha1508@gmail.com' ? 'admin' : 'citizen';
          const { error: profileError } = await supabase.from('users').insert({
            id: data.user.id,
            email: email,
            display_name: fullName,
            role: role,
            date_of_birth: dob,
          });
          if (profileError) throw profileError;
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-dark flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card-dark border border-gray-800 rounded-2xl overflow-hidden shadow-2xl relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-red via-brand-emerald to-brand-blue" />
        
        <div className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-brand-red/10 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-brand-red/20">
              <Shield className="w-8 h-8 text-brand-red" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-widest uppercase">Guardian Protocol</h1>
            <p className="text-gray-500 text-xs mt-2 uppercase tracking-widest font-mono">
              {isLogin ? 'Tactical Access Portal' : 'Citizen Registration'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-brand-red/10 border border-brand-red/20 rounded-lg text-brand-red text-xs font-mono uppercase">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="ENTER NAME"
                      className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:border-brand-red outline-none transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Date of Birth</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                    <input
                      type="date"
                      required
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:border-brand-red outline-none transition-all font-mono uppercase"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Email Terminal</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="EMAIL@PROTOCOL.SYS"
                  className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:border-brand-red outline-none transition-all font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Secure Key</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:border-brand-red outline-none transition-all font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-red hover:bg-red-600 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all group overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform" />
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span className="relative tracking-widest uppercase text-sm">
                    {isLogin ? 'Initiate Login' : 'Execute Registration'}
                  </span>
                  <ArrowRight className="w-4 h-4 relative group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 flex flex-col gap-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-800"></div>
              </div>
              <div className="relative flex justify-center text-[8px] uppercase tracking-[0.2em] font-mono">
                <span className="px-2 bg-card-dark text-gray-600">Alternative Authentication</span>
              </div>
            </div>

            <button
              onClick={() => signInWithGoogle()}
              className="w-full bg-white/5 border border-gray-800 hover:border-gray-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-3 transition-all"
            >
              <img src="https://www.google.com/favicon.ico" className="w-4 h-4 grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100" alt="Google" />
              <span className="text-xs uppercase tracking-widest">Override with Google</span>
            </button>
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-xs text-gray-500 hover:text-brand-red transition-colors uppercase tracking-widest font-mono"
            >
              {isLogin ? "Status: No Account? Register Now" : "Status: Existing Agent? Deploy Login"}
            </button>
          </div>
        </div>

        <div className="bg-black/20 p-4 flex justify-between items-center border-t border-gray-800">
          <p className="text-[8px] text-gray-600 font-mono uppercase tracking-widest">
            Protocol Version: 4.2.0-Alpha
          </p>
          <div className="flex gap-2">
            <div className="w-1 h-1 rounded-full bg-brand-emerald animate-pulse" />
            <div className="w-1 h-1 rounded-full bg-brand-emerald animate-pulse delay-75" />
            <div className="w-1 h-1 rounded-full bg-brand-emerald animate-pulse delay-150" />
          </div>
        </div>
      </div>
    </div>
  );
}

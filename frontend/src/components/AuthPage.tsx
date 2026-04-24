import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Mail, Lock, User, Calendar, Loader2, ArrowRight } from 'lucide-react';
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
          // Explicit profile insert
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

  const fillDemoData = () => {
    setEmail('anujjha@gmail.com');
    setPassword('anujjha');
    setActiveTab('login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
      >
        <div className="bg-brand-red p-8 text-white text-center">
          <Shield className="w-12 h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold tracking-tight">ResqNet Login</h1>
          <p className="text-red-100 text-sm mt-1">Emergency Management System</p>
        </div>

        <div className="p-8">
          {/* Simple Tab Switcher */}
          <div className="flex border-b border-gray-100 mb-8">
            <button 
              onClick={() => setActiveTab('login')}
              className={`flex-1 pb-4 text-sm font-semibold transition-all ${activeTab === 'login' ? 'text-brand-red border-b-2 border-brand-red' : 'text-gray-400'}`}
            >
              Login
            </button>
            <button 
              onClick={() => setActiveTab('register')}
              className={`flex-1 pb-4 text-sm font-semibold transition-all ${activeTab === 'register' ? 'text-brand-red border-b-2 border-brand-red' : 'text-gray-400'}`}
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
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Date of Birth</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="date"
                        required
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none transition-all"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red outline-none transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs text-center font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-red hover:bg-red-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-100"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  {activeTab === 'login' ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 space-y-4">
            <button
              onClick={fillDemoData}
              className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold py-3 rounded-lg border border-emerald-100 transition-all"
            >
              Judges: Login as Demo Admin
            </button>

            <button
              onClick={() => signInWithGoogle()}
              className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold py-3 rounded-lg flex items-center justify-center gap-3 transition-all"
            >
              <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
              Sign in with Google
            </button>
          </div>
        </div>

        <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">ResqNet © 2026</p>
        </div>
      </motion.div>
    </div>
  );
}

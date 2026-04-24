import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, MapPin, Radio, Activity, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-bg-dark text-text-primary flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full"
      >
        <header className="flex items-center gap-4 mb-12">
          <div className="w-16 h-16 bg-brand-red rounded shadow-[0_0_20px_rgba(220,38,38,0.5)] flex items-center justify-center">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">
              Resq<span className="text-brand-red">Net</span>
            </h1>
            <p className="text-xs font-mono text-text-secondary tracking-widest uppercase">
              Decentralized Emergency Command System
            </p>
          </div>
        </header>

        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <h2 className="text-5xl font-bold leading-tight">
              Rapid Response. <br />
              <span className="text-brand-red">Real-Time</span> Precision.
            </h2>
            <p className="text-lg text-text-secondary leading-relaxed">
              ResqNet bridges the gap between citizens in distress and rescue operations. 
              Live tracking, AI-powered dispatch, and seamless coordination.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <button 
                onClick={() => navigate('/login')}
                className="bg-brand-red hover:bg-red-700 text-white px-8 py-4 rounded font-bold uppercase tracking-widest flex items-center gap-2 transition-all group shadow-lg shadow-brand-red/20"
              >
                Launch Dashboard <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FeatureCard 
              icon={<MapPin className="text-brand-red" />} 
              title="LIVE TRACKING" 
              desc="Real-time GPS visibility of all rescue assets." 
            />
            <FeatureCard 
              icon={<Radio className="text-brand-emerald" />} 
              title="SOS DISPATCH" 
              desc="One-tap emergency reporting with precise location." 
            />
            <FeatureCard 
              icon={<Activity className="text-brand-blue" />} 
              title="ANALYTICS" 
              desc="Predictive routing and resource management." 
            />
            <FeatureCard 
              icon={<Shield className="text-purple-500" />} 
              title="SECURE" 
              desc="Encrypted communication for critical missions." 
            />
          </div>
        </div>
      </motion.div>

      <footer className="mt-20 text-[10px] font-mono text-text-secondary uppercase tracking-[0.3em] flex items-center gap-4">
        <span>System Status: Online</span>
        <span className="w-1.5 h-1.5 bg-brand-emerald rounded-full animate-pulse"></span>
        <span>Node: ASIA-SOUTH-1</span>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="bg-card-dark border border-gray-800 p-6 rounded-xl hover:border-gray-700 transition-colors">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xs font-bold font-mono text-white mb-2 tracking-widest uppercase">{title}</h3>
      <p className="text-xs text-text-secondary leading-relaxed">{desc}</p>
    </div>
  );
}

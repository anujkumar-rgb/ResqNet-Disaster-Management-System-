import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UserProfile } from './types';

// Pages
import CitizenPanel from './components/CitizenPanel';
import AdminDashboard from './components/AdminDashboard';
import RescueTeamPanel from './components/RescueTeamPanel';
import AuthPage from './components/AuthPage';
import LandingPage from './components/LandingPage';
import { Loader2 } from 'lucide-react';

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { user, profile, loading } = useAuth();
  
  const isEnvMissing = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (isEnvMissing) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-black text-red-500 p-10 text-center">
        <AlertCircle className="w-12 h-12 mb-4" />
        <h2 className="text-xl font-bold uppercase tracking-widest mb-2">Configuration Error</h2>
        <p className="text-xs font-mono text-gray-500 max-w-md">
          Supabase Environment Variables are missing. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your Vercel Project Settings.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-bg-dark text-text-primary">
        <Loader2 className="w-8 h-8 animate-spin text-brand-red" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={user ? <RoleRedirect profile={profile} /> : <LandingPage />} />
        <Route path="/login" element={user ? <RoleRedirect profile={profile} /> : <AuthPage />} />
        <Route path="/citizen" element={user ? <CitizenPanel /> : <Navigate to="/login" />} />
        <Route path="/admin" element={profile?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/login" />} />
        <Route path="/rescue" element={profile?.role === 'rescue_team' || profile?.role === 'admin' ? <RescueTeamPanel /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

function RoleRedirect({ profile }: { profile: UserProfile | null }) {
  if (!profile) {
    // If we have a user but no profile, redirect to login to reset or just go to citizen as default
    return <Navigate to="/citizen" replace />;
  }
  if (profile.role === 'admin') return <Navigate to="/admin" replace />;
  if (profile.role === 'rescue_team') return <Navigate to="/rescue" replace />;
  return <Navigate to="/citizen" replace />;
}

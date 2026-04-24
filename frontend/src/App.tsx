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
        <Route path="/rescue" element={profile?.role === 'rescue_team' ? <RescueTeamPanel /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

function RoleRedirect({ profile }: { profile: UserProfile | null }) {
  if (!profile) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-bg-dark text-text-primary">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-brand-red" />
          <p className="text-xs font-mono uppercase tracking-widest text-text-secondary animate-pulse text-center px-4">
            Initializing Encrypted Connection...
          </p>
        </div>
      </div>
    );
  }
  if (profile.role === 'admin') return <Navigate to="/admin" replace />;
  if (profile.role === 'rescue_team') return <Navigate to="/rescue" replace />;
  return <Navigate to="/citizen" replace />;
}

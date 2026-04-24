import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, signInWithGoogle, signOut as supabaseSignOut } from '../lib/supabase';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        await fetchProfile(currentUser.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data: userProfile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create it (bootstrap)
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const role = user.email === 'anujkumarjha1508@gmail.com' ? 'admin' : 'citizen';
          const newProfile: UserProfile = {
            id: user.id,
            email: user.email || 'guest@demo.sys',
            role: role as UserRole,
            display_name: user.user_metadata?.full_name || 'Anonymous Guest',
          };
          const { data: createdProfile, error: insertError } = await supabase
            .from('users')
            .insert(newProfile)
            .select()
            .single();
          
          if (!insertError) setProfile(createdProfile);
        }
      } else if (!error) {
        setProfile(userProfile);
      }
    } catch (err) {
      console.error("Critical Auth/Profile Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async () => {
    await signInWithGoogle();
  };

  const signOut = async () => {
    await supabaseSignOut();
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

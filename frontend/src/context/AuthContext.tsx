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
      const sUser = session?.user ?? null;
      setUser(sUser);
      if (sUser) {
        fetchProfile(sUser);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        await fetchProfile(currentUser);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (sUser: User) => {
    try {
      const { data: userProfile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', sUser.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create it (bootstrap)
        const role = sUser.email === 'anujkumarjha1508@gmail.com' ? 'admin' : 'citizen';
        const newProfile: UserProfile = {
          id: sUser.id,
          email: sUser.email || 'guest@demo.sys',
          role: role as UserRole,
          display_name: sUser.user_metadata?.full_name || 'Anonymous Guest',
        };
        const { data: createdProfile, error: insertError } = await supabase
          .from('users')
          .insert(newProfile)
          .select()
          .single();
        
        if (!insertError) {
          setProfile(createdProfile);
        } else {
          // Fallback if insert fails
          setProfile(newProfile);
        }
      } else if (!error) {
        setProfile(userProfile);
      } else {
        console.warn("Profile fetch error, using fallback:", error);
        setProfile({
          id: sUser.id,
          email: sUser.email || '',
          role: (sUser.email === 'anujkumarjha1508@gmail.com' ? 'admin' : 'citizen') as UserRole,
          display_name: sUser.user_metadata?.full_name || 'User'
        });
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

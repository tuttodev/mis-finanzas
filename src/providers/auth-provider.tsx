'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { WelcomeScreen } from '@/components/auth/login-screen';

type AuthContextValue = {
  session: Session;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue | null>(() => {
    if (!session) return null;
    return {
      session,
      signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw new Error(error.message);
      },
    };
  }, [session]);

  // Render the public welcome page on the server and during hydration. Besides
  // avoiding a blank first paint, this makes the landing-page content available
  // to crawlers before the browser checks for an existing session.
  if (loading || !session || !value) return <WelcomeScreen />;
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

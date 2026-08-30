'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { WelcomeScreen } from '@/components/auth/login-screen';
import posthog from 'posthog-js';

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
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) posthog.identify(data.session.user.id);
      setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        posthog.identify(nextSession.user.id);
      } else if (event === 'SIGNED_OUT') {
        posthog.reset();
      }
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

  // These pages are intentionally public so they can be read before signing in.
  if (pathname === '/sobre-jireh' || pathname === '/fundador') return children;

  // Render the public welcome page on the server and during hydration. Besides
  // avoiding a blank first paint, this makes the landing-page content available
  // to crawlers before the browser checks for an existing session.
  if (loading || !session || !value) return <WelcomeScreen />;
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

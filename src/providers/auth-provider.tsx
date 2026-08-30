'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import posthog from 'posthog-js';
import { captureAnalytics } from '@/lib/analytics';

type AuthContextValue = {
  session: Session;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function isNewAccount(session: Session): boolean {
  const createdAt = Date.parse(session.user.created_at);
  const lastSignInAt = Date.parse(session.user.last_sign_in_at ?? '');

  return (
    Number.isFinite(createdAt) &&
    Number.isFinite(lastSignInAt) &&
    lastSignInAt >= createdAt &&
    lastSignInAt - createdAt < 60_000
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
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
        if (event === 'SIGNED_IN') {
          const newAccount = isNewAccount(nextSession);
          captureAnalytics('auth_completed', { provider: 'google', is_new_user: newAccount });
          if (newAccount) captureAnalytics('account_registered', { provider: 'google' });
        }
      } else if (event === 'SIGNED_OUT') {
        posthog.reset();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading && !session) router.replace('/');
  }, [loading, router, session]);

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

  if (loading || !session || !value) return null;
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import posthog from 'posthog-js';
import { AnalyticsEvent } from '@/shared/analytics/analytics-event.enum';
import { captureAnalytics } from '@/shared/analytics/analytics';
import { AppRoute } from '@/shared/navigation/app-route.enum';
import { AuthEvent, AuthProvider as IdentityProvider, isNewAccount, type AuthSession } from '../domain/auth.types';
import { getSession, onAuthStateChange, signOut } from './auth.use-cases';

type AuthContextValue = {
  session: AuthSession;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const activeUserId = useRef<string | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSession().then((current) => {
      activeUserId.current = current?.user.id ?? null;
      setSession(current);
      if (current) posthog.identify(current.user.id);
      setLoading(false);
    });
    return onAuthStateChange((event, nextSession) => {
      const nextUserId = nextSession?.user.id ?? null;
      if (activeUserId.current && activeUserId.current !== nextUserId) queryClient.clear();
      activeUserId.current = nextUserId;
      setSession(nextSession);
      if (nextSession) {
        posthog.identify(nextSession.user.id);
        if (event === AuthEvent.SignedIn) {
          const newAccount = isNewAccount(nextSession.user);
          captureAnalytics(AnalyticsEvent.AuthCompleted, { provider: IdentityProvider.Google, is_new_user: newAccount });
          if (newAccount) captureAnalytics(AnalyticsEvent.AccountRegistered, { provider: IdentityProvider.Google });
        }
      } else if (event === AuthEvent.SignedOut) {
        posthog.reset();
      }
    });
  }, [queryClient]);

  useEffect(() => {
    if (!loading && !session) router.replace(AppRoute.Home);
  }, [loading, router, session]);

  const value = useMemo<AuthContextValue | null>(() => {
    if (!session) return null;
    return { session, signOut };
  }, [session]);

  if (loading || !session || !value) return null;
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

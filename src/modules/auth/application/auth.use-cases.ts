import { repositories } from '@/infrastructure/repositories';
import type { AuthProvider, AuthSession } from '../domain/auth.types';

export function getSession(): Promise<AuthSession | null> {
  return repositories.auth.getSession();
}

/** Returns the signed-in session or fails with a message asking to sign in again. */
export async function requireSession(): Promise<AuthSession> {
  const session = await repositories.auth.getSession();
  if (!session) throw new Error('Tu sesión venció. Inicia sesión nuevamente.');
  return session;
}

export function signInWithProvider(provider: AuthProvider, redirectTo: string): Promise<void> {
  return repositories.auth.signInWithProvider(provider, redirectTo);
}

export function signOut(): Promise<void> {
  return repositories.auth.signOut();
}

export const onAuthStateChange: typeof repositories.auth.onAuthStateChange = (listener) =>
  repositories.auth.onAuthStateChange(listener);

import type { AuthProvider, AuthSession } from '../domain/auth.types';

export type AuthStateListener = (event: string, session: AuthSession | null) => void;

export interface AuthRepository {
  getSession(): Promise<AuthSession | null>;
  /** Subscribes to session changes and returns the unsubscribe function. */
  onAuthStateChange(listener: AuthStateListener): () => void;
  signInWithProvider(provider: AuthProvider, redirectTo: string): Promise<void>;
  signOut(): Promise<void>;
}

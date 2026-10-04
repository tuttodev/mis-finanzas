import type { Session } from '@supabase/supabase-js';
import type { SupabaseClient } from '@/infrastructure/supabase/client';
import { ensureSuccess } from '@/infrastructure/supabase/supabase-result';
import type { AuthProvider, AuthSession } from '../../domain/auth.types';
import type { AuthRepository, AuthStateListener } from '../auth.repository';

function mapSession(session: Session | null): AuthSession | null {
  if (!session) return null;
  const metadata = session.user.user_metadata ?? {};

  return {
    accessToken: session.access_token,
    user: {
      id: session.user.id,
      email: session.user.email ?? null,
      providerName: metadata.full_name ?? metadata.name ?? '',
      providerAvatarUrl: metadata.avatar_url ?? metadata.picture ?? '',
      createdAt: session.user.created_at,
      lastSignInAt: session.user.last_sign_in_at ?? null,
    },
  };
}

export class SupabaseAuthRepository implements AuthRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getSession(): Promise<AuthSession | null> {
    const { data } = await this.client.auth.getSession();
    return mapSession(data.session);
  }

  onAuthStateChange(listener: AuthStateListener): () => void {
    const { data } = this.client.auth.onAuthStateChange((event, session) => {
      listener(event, mapSession(session));
    });
    return () => data.subscription.unsubscribe();
  }

  async signInWithProvider(provider: AuthProvider, redirectTo: string): Promise<void> {
    const { error } = await this.client.auth.signInWithOAuth({ provider, options: { redirectTo } });
    ensureSuccess(error);
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    ensureSuccess(error);
  }
}

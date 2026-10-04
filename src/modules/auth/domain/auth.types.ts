export enum AuthEvent {
  SignedIn = 'SIGNED_IN',
  SignedOut = 'SIGNED_OUT',
}

export enum AuthProvider {
  Google = 'google',
}

export type AuthUser = {
  id: string;
  email: string | null;
  /** Name reported by the identity provider. */
  providerName: string;
  /** Avatar URL reported by the identity provider. */
  providerAvatarUrl: string;
  createdAt: string;
  lastSignInAt: string | null;
};

export type AuthSession = {
  user: AuthUser;
  accessToken: string;
};

/** A sign-in shortly after account creation means the user just registered. */
export function isNewAccount(user: AuthUser, windowMs = 60_000): boolean {
  const createdAt = Date.parse(user.createdAt);
  const lastSignInAt = Date.parse(user.lastSignInAt ?? '');

  return (
    Number.isFinite(createdAt) &&
    Number.isFinite(lastSignInAt) &&
    lastSignInAt >= createdAt &&
    lastSignInAt - createdAt < windowMs
  );
}

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  async function handleGoogleSignIn() {
    setGoogleSubmitting(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (signInError) {
      setError('No se pudo iniciar sesión con Google. Inténtalo de nuevo.');
      setGoogleSubmitting(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      setError('Correo o contraseña incorrectos');
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Image src="/logo.png" alt="Jireh Finanzas" width={64} height={64} className="object-contain" priority />
          <div>
            <h1 className="font-display text-2xl font-semibold">Jireh Finanzas</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Inicia sesión para continuar
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="w-full"
            disabled={googleSubmitting || submitting}
            onClick={handleGoogleSignIn}
          >
            {googleSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <span aria-hidden className="text-base font-semibold">G</span>
            )}
            {googleSubmitting ? 'Conectando…' : 'Continuar con Google'}
          </Button>

          <div className="my-5 flex items-center gap-3" aria-hidden>
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">o usa tu acceso actual</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={submitting || googleSubmitting}
            >
              {submitting ? 'Ingresando…' : 'Ingresar'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

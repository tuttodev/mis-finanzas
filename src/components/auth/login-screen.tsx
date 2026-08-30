'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

export function LoginScreen() {
  const [error, setError] = useState<string | null>(null);
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

  return (
    <div className="flex min-h-dvh items-center justify-center px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Image src="/logo.png" alt="Jireh Finanzas" width={64} height={64} className="object-contain" priority />
          <div>
            <h1 className="font-display text-2xl font-semibold">Jireh Finanzas</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Usa tu cuenta de Google para continuar
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="w-full"
            disabled={googleSubmitting}
            onClick={handleGoogleSignIn}
          >
            {googleSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <span aria-hidden className="text-base font-semibold">G</span>
            )}
            {googleSubmitting ? 'Conectando…' : 'Continuar con Google'}
          </Button>
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        </div>
      </div>
    </div>
  );
}

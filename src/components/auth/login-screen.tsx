'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ArrowRight, Check, Download, Loader2, Target, WalletCards } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

export function WelcomeScreen() {
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
    <main className="relative isolate min-h-dvh overflow-hidden px-5 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[31rem] bg-[radial-gradient(ellipse_at_top,rgba(233,186,83,0.15),transparent_62%)]" />
      <div className="pointer-events-none absolute -top-32 right-[-8rem] -z-10 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />

      <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col">
        <header className="flex items-center justify-between py-5 sm:py-7">
          <div className="flex items-center gap-2.5">
            <Image
              src="/logo.png"
              alt="Jireh Finanzas"
              width={38}
              height={38}
              className="object-contain"
              priority
            />
            <span className="font-display text-lg font-semibold tracking-tight">Jireh Finanzas</span>
          </div>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleSubmitting}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            Iniciar sesión
          </button>
        </header>

        <section className="grid flex-1 items-center gap-12 py-10 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div className="max-w-xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Tus finanzas, con propósito
            </p>
            <h1 className="font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Ordena tu dinero. <span className="text-primary">Vive con calma.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
              Jireh Finanzas te ayuda a entender tu dinero, registrar tus movimientos y avanzar hacia las metas que más importan.
            </p>

            <div className="mt-8 max-w-sm">
              <Button
                type="button"
                size="lg"
                className="h-12 w-full gap-2 rounded-xl text-base font-semibold shadow-lg shadow-primary/10"
                disabled={googleSubmitting}
                onClick={handleGoogleSignIn}
              >
                {googleSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span aria-hidden className="grid size-5 place-items-center rounded-full bg-primary-foreground text-xs font-bold text-primary">G</span>
                )}
                {googleSubmitting ? 'Conectando…' : 'Registrarme o iniciar sesión con Google'}
                {!googleSubmitting && <ArrowRight className="ml-0.5 h-4 w-4" />}
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">Empieza gratis con tu cuenta de Google.</p>
              {error && <p className="mt-3 text-center text-sm text-destructive">{error}</p>}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="absolute -inset-5 -z-10 rounded-[2.5rem] bg-primary/10 blur-2xl" />
            <div className="rounded-3xl border border-border bg-card/90 p-5 shadow-2xl shadow-black/20 backdrop-blur sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Disponible este mes</p>
                  <p className="mt-1 font-display text-3xl font-semibold">$ 2.450.000</p>
                </div>
                <div className="grid size-11 place-items-center rounded-2xl bg-primary/15 text-primary">
                  <WalletCards className="size-5" />
                </div>
              </div>
              <div className="mt-6 h-28 rounded-2xl border border-border bg-secondary/50 p-4">
                <div className="flex h-full items-end gap-2">
                  {[34, 55, 42, 73, 58, 88, 66].map((height, index) => (
                    <div
                      key={index}
                      className="flex-1 rounded-full bg-primary/25 first:bg-primary"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-secondary/70 p-3.5">
                  <p className="text-xs text-muted-foreground">Ingresos</p>
                  <p className="mt-1 font-display text-base font-semibold text-income">+ $ 3.200.000</p>
                </div>
                <div className="rounded-2xl bg-secondary/70 p-3.5">
                  <p className="text-xs text-muted-foreground">Gastos</p>
                  <p className="mt-1 font-display text-base font-semibold text-foreground">$ 750.000</p>
                </div>
              </div>
              <div className="mt-5 flex items-center gap-3 rounded-2xl border border-primary/15 bg-primary/10 p-3.5">
                <div className="grid size-9 place-items-center rounded-xl bg-primary/20 text-primary">
                  <Target className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-medium">Fondo de emergencia</span>
                    <span className="text-primary">68%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background/70">
                    <div className="h-full w-[68%] rounded-full bg-primary" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 pb-8 sm:grid-cols-2 lg:grid-cols-4 sm:pb-10">
          {[
            'Registra ingresos, gastos y transferencias.',
            'Visualiza tus cuentas y presupuestos en un solo lugar.',
            'Tus datos son tuyos: descarga tus movimientos en CSV cuando quieras.',
            'Instálala gratis y ábrela desde tu pantalla de inicio.',
          ].map((feature) => (
            <div key={feature} className="flex items-start gap-2.5 rounded-xl border border-border bg-card/50 p-3 text-sm text-muted-foreground">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{feature}</span>
            </div>
          ))}
        </section>

        <section className="mb-8 rounded-3xl border border-border bg-card/70 p-5 sm:mb-10 sm:p-7">
          <div className="max-w-xl">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-primary">
              <Download className="size-4" />
              Llévala contigo
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Instala Jireh Finanzas como una app, gratis.
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
              No necesitas ir a una tienda: añádela a la pantalla de inicio y ábrela cuando quieras, como cualquier otra app.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-border bg-secondary/40 p-4">
              <h3 className="font-semibold">Android · Chrome</h3>
              <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">1</span>
                  Abre el menú de los tres puntos (⋮) en Chrome.
                </li>
                <li className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">2</span>
                  Toca <strong className="font-medium text-foreground">Instalar app</strong> o <strong className="font-medium text-foreground">Agregar a pantalla principal</strong>.
                </li>
              </ol>
            </article>

            <article className="rounded-2xl border border-border bg-secondary/40 p-4">
              <h3 className="font-semibold">iPhone o iPad · Safari</h3>
              <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">1</span>
                  Toca el botón Compartir de Safari.
                </li>
                <li className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">2</span>
                  Elige <strong className="font-medium text-foreground">Agregar a pantalla de inicio</strong> y confirma con <strong className="font-medium text-foreground">Agregar</strong>.
                </li>
              </ol>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}

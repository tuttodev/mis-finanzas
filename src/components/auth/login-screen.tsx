'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Check, Download, HandHeart, Loader2, Mail, Menu, Target, WalletCards, X } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
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
        <header className="relative z-10 py-5 sm:py-7">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-6">
            <div className="flex min-w-0 items-center gap-2.5">
              <Image
                src="/logo.png"
                alt="Jireh Finanzas"
                width={38}
                height={38}
                className="size-8 object-contain sm:size-[38px]"
                priority
              />
              <span className="truncate font-display text-base font-semibold tracking-tight sm:text-lg">Jireh Finanzas</span>
            </div>
            <nav className="hidden items-center justify-center gap-7 lg:flex" aria-label="Información sobre Jireh Finanzas">
              <Link
                href="/sobre-jireh"
                className="inline-flex whitespace-nowrap items-center gap-2 text-sm font-semibold text-primary underline-offset-4 transition-colors hover:text-primary/80 hover:underline"
              >
                Conoce por qué nació Jireh Finanzas
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/fundador"
                className="inline-flex whitespace-nowrap items-center gap-2 text-sm font-semibold text-primary underline-offset-4 transition-colors hover:text-primary/80 hover:underline"
              >
                Conoce a nuestro fundador
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </nav>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleSubmitting}
                className="shrink-0 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
              >
                Iniciar sesión
              </button>
              <details className="group relative lg:hidden">
                <summary
                  aria-label="Abrir menú de navegación"
                  className="grid size-9 cursor-pointer list-none place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden"
                >
                  <Menu className="size-5 group-open:hidden" aria-hidden="true" />
                  <X className="hidden size-5 group-open:block" aria-hidden="true" />
                </summary>
                <nav
                  id="public-navigation"
                  className="absolute top-[calc(100%+0.75rem)] right-0 hidden w-72 gap-1 rounded-2xl border border-border bg-card p-2 shadow-xl shadow-black/20 group-open:grid"
                  aria-label="Información sobre Jireh Finanzas"
                >
                  <Link
                    href="/sobre-jireh"
                    className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Conoce por qué nació Jireh Finanzas
                    <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
                  </Link>
                  <Link
                    href="/fundador"
                    className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Conoce a nuestro fundador
                    <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
                  </Link>
                </nav>
              </details>
            </div>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-12 py-10 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div className="max-w-xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Finanzas personales de la mano de Dios
            </p>
            <h1 className="font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Dios provee. <span className="text-primary">Administra con sabiduría.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
              Jireh Finanzas te acompaña a cuidar los recursos que recibes, ordenar tus movimientos y avanzar con fe, gratitud y claridad hacia tus metas.
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
                  <span aria-hidden className="grid size-5 place-items-center rounded-full bg-white p-0.5">
                    <FcGoogle className="size-full" />
                  </span>
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
              <div className="mt-3 flex items-center gap-2 text-xs leading-5 text-muted-foreground">
                <HandHeart className="size-4 shrink-0 text-primary" />
                Planifica con responsabilidad y confía en que Dios abre camino.
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 pb-8 sm:grid-cols-2 lg:grid-cols-4 sm:pb-10">
          {[
            'Ordena tus recursos con sabiduría y gratitud.',
            'Visualiza tus cuentas y presupuestos en un solo lugar.',
            'Avanza con fe hacia cada meta que Dios pone en tu corazón.',
            'Tus datos son tuyos: llévalos contigo cuando quieras.',
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
              Lleva Jireh Finanzas contigo, donde vayas.
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

        <footer className="border-t border-border py-6 text-center">
          <p className="text-sm font-medium">¿Necesitas soporte técnico?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Estamos aquí para ayudarte con lo que necesites.
          </p>
          <div className="mt-4 flex flex-col items-center justify-center gap-3 text-sm sm:flex-row sm:gap-5">
            <a
              href="https://wa.me/573209645371?text=Hola%2C%20necesito%20soporte%20t%C3%A9cnico."
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-primary transition-colors hover:text-primary/80"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="size-4"
                fill="#25D366"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              WhatsApp · +57 320 964 5371
            </a>
            <a
              href="mailto:soportejirehfinanzas@gmail.com"
              className="inline-flex items-center gap-2 text-primary transition-colors hover:text-primary/80"
            >
              <Mail className="size-4 text-[#EA4335]" aria-hidden="true" />
              soportejirehfinanzas@gmail.com
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}

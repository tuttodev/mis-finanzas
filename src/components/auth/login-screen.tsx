'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Check,
  Download,
  Landmark,
  Loader2,
  Mail,
  Menu,
  PiggyBank,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UsersRound,
  WalletCards,
  X,
} from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { FaInstagram } from 'react-icons/fa';
import { supabase } from '@/lib/supabase';
import { captureAnalytics } from '@/lib/analytics';
import { Button } from '@/components/ui/button';

const benefits = [
  {
    icon: ReceiptText,
    title: 'Todo gasto tiene su lugar',
    description: 'Registra movimientos y entiende en qué se va el dinero del hogar.',
  },
  {
    icon: Target,
    title: 'Presupuestos que sí funcionan',
    description: 'Define límites claros por categoría y ajusta el plan a tu realidad.',
  },
  {
    icon: PiggyBank,
    title: 'Metas visibles para todos',
    description: 'Convierte el ahorro en avances concretos que tu familia puede celebrar.',
  },
];

const steps = [
  {
    icon: Landmark,
    title: 'Agrega tus cuentas',
    description: 'Reúne efectivo, bancos y demás saldos en una sola vista.',
  },
  {
    icon: ReceiptText,
    title: 'Registra lo que entra y sale',
    description: 'Clasifica cada movimiento para entender tus hábitos.',
  },
  {
    icon: TrendingUp,
    title: 'Ajusta y avanza',
    description: 'Revisa tu presupuesto y enfoca el dinero en lo que importa.',
  },
];

export function WelcomeScreen() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/app');
    });
  }, [router]);

  async function handleGoogleSignIn(entrypoint: 'header' | 'hero' | 'mobile_menu') {
    captureAnalytics('auth_started', { provider: 'google', entrypoint });
    setGoogleSubmitting(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/app`,
      },
    });

    if (signInError) {
      captureAnalytics('auth_failed', { provider: 'google' });
      setError('No se pudo iniciar sesión con Google. Inténtalo de nuevo.');
      setGoogleSubmitting(false);
    }
  }

  function trackSection(destination: string) {
    captureAnalytics('public_navigation_selected', { destination, surface: 'mobile' });
    setMobileMenuOpen(false);
  }

  return (
    <main className="relative isolate min-h-dvh overflow-hidden bg-[#080d19] px-5 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-[#f7f8fb] sm:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[46rem] bg-[radial-gradient(ellipse_at_top_left,rgba(75,166,255,0.18),transparent_48%),radial-gradient(ellipse_at_top_right,rgba(233,186,83,0.14),transparent_50%)]" />
      <div className="pointer-events-none absolute left-1/2 top-80 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-[#4ba6ff]/10 blur-3xl" />

      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col">
        <header className="relative z-10 py-5 sm:py-7">
          <div className="flex items-center justify-between gap-6">
            <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="Jireh Finanzas, inicio">
              <span className="grid size-10 place-items-center rounded-2xl border border-white/10 bg-white/5 shadow-lg shadow-black/20">
                <Image
                  src="/logo.png"
                  alt=""
                  width={36}
                  height={36}
                  className="size-7 object-contain"
                  priority
                />
              </span>
              <span className="truncate font-display text-base font-semibold tracking-tight sm:text-lg">Jireh Finanzas</span>
            </Link>

            <nav className="hidden items-center gap-8 lg:flex" aria-label="Navegación principal">
              <Link href="#beneficios" className="text-sm font-medium text-white/60 transition-colors hover:text-white">
                Lo que puedes hacer
              </Link>
              <Link href="#como-funciona" className="text-sm font-medium text-white/60 transition-colors hover:text-white">
                Cómo funciona
              </Link>
              <Link href="#instalar" className="text-sm font-medium text-white/60 transition-colors hover:text-white">
                Instalar la app
              </Link>
            </nav>

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => handleGoogleSignIn('header')}
                disabled={googleSubmitting}
                className="hidden h-10 items-center gap-2 rounded-full border border-white/12 bg-white/5 px-5 text-sm font-semibold transition-colors hover:bg-white/10 disabled:pointer-events-none disabled:opacity-50 lg:inline-flex"
              >
                Iniciar sesión
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Abrir menú de navegación"
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-public-navigation"
                onClick={() => {
                  captureAnalytics('public_menu_opened');
                  setMobileMenuOpen(true);
                }}
                className="grid size-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e9ba53] lg:hidden"
              >
                <Menu className="size-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </header>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú de navegación">
            <button
              type="button"
              aria-label="Cerrar menú"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute inset-0 bg-[#080d19]/80 backdrop-blur-sm"
            />
            <aside className="absolute inset-y-0 right-0 flex w-full flex-col border-l border-white/10 bg-[#0d1423] px-5 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-2xl shadow-black/50 animate-in slide-in-from-right duration-300 sm:max-w-md sm:px-8">
              <div className="flex items-center justify-between">
                <span className="font-display text-lg font-semibold">Explora Jireh</span>
                <button
                  type="button"
                  aria-label="Cerrar menú de navegación"
                  onClick={() => setMobileMenuOpen(false)}
                  className="grid size-10 place-items-center rounded-xl text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e9ba53]"
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              </div>

              <nav id="mobile-public-navigation" className="mt-10 grid gap-2" aria-label="Navegación principal">
                {[
                  ['Lo que puedes hacer', '#beneficios'],
                  ['Cómo funciona', '#como-funciona'],
                  ['Instalar la app', '#instalar'],
                ].map(([label, href]) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => trackSection(href)}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base font-semibold transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e9ba53]"
                  >
                    {label}
                    <ArrowRight className="size-5 shrink-0 text-[#e9ba53]" aria-hidden="true" />
                  </Link>
                ))}
              </nav>

              <div className="mt-auto border-t border-white/10 pt-6">
                <Button
                  type="button"
                  size="lg"
                  className="h-12 w-full rounded-xl bg-[#e9ba53] text-base font-semibold text-[#171104] hover:bg-[#f4c765]"
                  disabled={googleSubmitting}
                  onClick={() => handleGoogleSignIn('mobile_menu')}
                >
                  {googleSubmitting ? <Loader2 className="size-4 animate-spin" /> : <FcGoogle className="size-5" />}
                  {googleSubmitting ? 'Conectando…' : 'Continuar con Google'}
                </Button>
                <p className="mt-3 text-center text-xs text-white/45">Gratis para empezar. Sin tarjeta de crédito.</p>
              </div>
            </aside>
          </div>
        )}

        <section className="grid min-h-[calc(100dvh-6rem)] items-center gap-14 py-12 lg:grid-cols-[1.02fr_0.98fr] lg:gap-20 lg:py-16">
          <div className="min-w-0 max-w-2xl">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#e9ba53]/25 bg-[#e9ba53]/10 px-3.5 py-2 text-sm font-medium text-[#f3cb75]">
              <UsersRound className="size-4" aria-hidden="true" />
              Finanzas claras para hogares reales
            </p>
            <h1 className="font-display text-[clamp(2.75rem,7vw,5rem)] font-semibold leading-[0.98] tracking-[-0.055em]">
              El dinero de tu familia,{' '}
              <span className="bg-gradient-to-r from-[#f1c566] via-[#ffd98a] to-[#78c2ff] bg-clip-text text-transparent">
                claro y bajo control.
              </span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-white/58 sm:text-lg sm:leading-8">
              Organiza cuentas, gastos, presupuestos y metas en un solo lugar. Menos conversaciones difíciles sobre dinero; más decisiones en equipo.
            </p>

            <div className="mt-9 max-w-md">
              <Button
                type="button"
                size="lg"
                className="h-13 w-full gap-2 rounded-2xl bg-[#e9ba53] px-5 text-base font-semibold text-[#171104] shadow-xl shadow-[#e9ba53]/10 hover:bg-[#f4c765] sm:w-auto"
                disabled={googleSubmitting}
                onClick={() => handleGoogleSignIn('hero')}
              >
                {googleSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <span aria-hidden className="grid size-5 place-items-center rounded-full bg-white p-0.5">
                    <FcGoogle className="size-full" />
                  </span>
                )}
                {googleSubmitting ? 'Conectando…' : 'Empezar gratis con Google'}
                {!googleSubmitting && <ArrowRight className="size-4" aria-hidden="true" />}
              </Button>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/45">
                <span className="inline-flex items-center gap-1.5"><Check className="size-3.5 text-[#6ed6ad]" /> Sin tarjeta</span>
                <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-[#6ed6ad]" /> Tus datos son tuyos</span>
              </div>
              {error && <p className="mt-3 text-sm text-[#ff8d8d]">{error}</p>}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
            <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-gradient-to-br from-[#4ba6ff]/15 via-transparent to-[#e9ba53]/15 blur-3xl" />
            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#101827]/95 p-3 shadow-2xl shadow-black/40 backdrop-blur sm:p-4">
              <div className="rounded-[1.45rem] border border-white/[0.07] bg-[#0b1120] p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-white/45">Panorama familiar · Septiembre</p>
                    <p className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">$ 2.450.000</p>
                    <p className="mt-1 text-xs text-[#6ed6ad]">Disponible para el resto del mes</p>
                  </div>
                  <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#4ba6ff]/15 text-[#78c2ff]">
                    <WalletCards className="size-5" aria-hidden="true" />
                  </div>
                </div>

                <div className="mt-7 grid grid-cols-7 items-end gap-2" aria-label="Resumen visual del presupuesto semanal">
                  {[48, 62, 39, 76, 57, 88, 68].map((height, index) => (
                    <div key={index} className="flex h-24 items-end rounded-full bg-white/[0.04] p-1">
                      <div
                        className={`w-full rounded-full ${index === 5 ? 'bg-gradient-to-t from-[#e9ba53] to-[#ffe1a0]' : 'bg-[#4ba6ff]/45'}`}
                        style={{ height: `${height}%` }}
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.035] p-4">
                    <p className="text-xs text-white/45">Ingresos</p>
                    <p className="mt-1.5 font-display text-base font-semibold text-[#6ed6ad]">+ $ 4.200.000</p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.035] p-4">
                    <p className="text-xs text-white/45">Gastos</p>
                    <p className="mt-1.5 font-display text-base font-semibold">$ 1.750.000</p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-[#e9ba53]/15 bg-[#e9ba53]/[0.07] p-4">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="inline-flex items-center gap-2 font-medium"><Target className="size-4 text-[#e9ba53]" /> Fondo de emergencia</span>
                    <span className="font-semibold text-[#f1c566]">68%</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/25">
                    <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-[#e9ba53] to-[#ffd989]" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 px-2 pb-1 pt-3 text-center text-[11px] text-white/40 sm:text-xs">
                <span>Un solo panorama</span>
                <span>Decisiones simples</span>
                <span>Metas en familia</span>
              </div>
            </div>
          </div>
        </section>

        <section id="beneficios" className="scroll-mt-24 border-t border-white/10 py-20 sm:py-24">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#78c2ff]">Menos enredos, más claridad</p>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-5xl">Una vista honesta de la vida financiera de tu hogar.</h2>
            <p className="mt-5 text-base leading-7 text-white/55 sm:text-lg">Jireh convierte números dispersos en información que puedes entender y usar.</p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {benefits.map(({ icon: Icon, title, description }, index) => (
              <article key={title} className="group rounded-3xl border border-white/10 bg-white/[0.035] p-6 transition-colors hover:bg-white/[0.06] sm:p-7">
                <div className="flex items-center justify-between">
                  <div className={`grid size-11 place-items-center rounded-2xl ${index === 1 ? 'bg-[#e9ba53]/15 text-[#f1c566]' : index === 2 ? 'bg-[#6ed6ad]/15 text-[#6ed6ad]' : 'bg-[#4ba6ff]/15 text-[#78c2ff]'}`}>
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                  <span className="font-mono text-xs text-white/25">0{index + 1}</span>
                </div>
                <h3 className="mt-7 font-display text-xl font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/50 sm:text-base">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="como-funciona" className="scroll-mt-24 py-10 sm:py-16">
          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-6 sm:p-10 lg:p-12">
            <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
              <div>
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#f1c566]"><Sparkles className="size-4" /> Simple desde el primer día</p>
                <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Tres pasos para empezar a decidir mejor.</h2>
                <p className="mt-4 leading-7 text-white/50">No necesitas saber de contabilidad. Solo trae tus números; Jireh te ayuda a ponerlos en orden.</p>
              </div>
              <ol className="grid gap-3">
                {steps.map(({ icon: StepIcon, title, description }, index) => (
                  <li key={title} className="flex gap-4 rounded-2xl border border-white/[0.07] bg-[#0b1120]/60 p-4 sm:items-center sm:p-5">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-[#78c2ff]"><StepIcon className="size-5" aria-hidden="true" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold"><span className="mr-2 text-[#e9ba53]">{index + 1}.</span>{title}</p>
                      <p className="mt-1 text-sm leading-6 text-white/45">{description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section id="instalar" className="scroll-mt-24 py-20 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
            <div className="max-w-lg">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#78c2ff]"><Download className="size-4" /> Siempre a la mano</p>
              <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Úsala como una app, sin ir a una tienda.</h2>
              <p className="mt-4 leading-7 text-white/50">Agrégala a tu pantalla de inicio y abre tus finanzas cuando las necesites.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">
                <h3 className="font-display text-lg font-semibold">Android · Chrome</h3>
                <ol className="mt-5 space-y-4 text-sm leading-6 text-white/50">
                  <li className="flex gap-3"><span className="font-semibold text-[#e9ba53]">01</span><span>Abre el menú de tres puntos (⋮).</span></li>
                  <li className="flex gap-3"><span className="font-semibold text-[#e9ba53]">02</span><span>Toca <strong className="font-medium text-white/80">Instalar app</strong> o <strong className="font-medium text-white/80">Agregar a pantalla principal</strong>.</span></li>
                </ol>
              </article>
              <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">
                <h3 className="font-display text-lg font-semibold">iPhone o iPad · Safari</h3>
                <ol className="mt-5 space-y-4 text-sm leading-6 text-white/50">
                  <li className="flex gap-3"><span className="font-semibold text-[#78c2ff]">01</span><span>Toca el botón Compartir de Safari.</span></li>
                  <li className="flex gap-3"><span className="font-semibold text-[#78c2ff]">02</span><span>Elige <strong className="font-medium text-white/80">Agregar a pantalla de inicio</strong> y confirma.</span></li>
                </ol>
              </article>
            </div>
          </div>
        </section>

        <section className="mb-16 overflow-hidden rounded-[2rem] border border-[#e9ba53]/20 bg-[#e9ba53] p-7 text-[#171104] sm:p-10 lg:flex lg:items-center lg:justify-between lg:gap-10">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] opacity-60">Tu próximo mes puede sentirse distinto</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Empieza a organizar las finanzas de tu hogar hoy.</h2>
          </div>
          <Button
            type="button"
            size="lg"
            className="mt-7 h-12 w-full shrink-0 rounded-xl bg-[#111827] px-6 text-base font-semibold text-white hover:bg-[#1f2937] lg:mt-0 lg:w-auto"
            disabled={googleSubmitting}
            onClick={() => handleGoogleSignIn('hero')}
          >
            {googleSubmitting ? <Loader2 className="size-4 animate-spin" /> : <FcGoogle className="size-5" />}
            {googleSubmitting ? 'Conectando…' : 'Empezar con Google'}
          </Button>
        </section>

        <footer className="border-t border-white/10 py-8">
          <div className="flex flex-col gap-6 text-sm sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-display font-semibold">Jireh Finanzas</p>
              <p className="mt-1 text-white/40">Claridad financiera para cada familia.</p>
            </div>
            <div className="flex flex-col gap-3 text-white/55 sm:items-end">
              <p className="text-xs uppercase tracking-[0.14em] text-white/30">¿Necesitas ayuda?</p>
              <div className="flex flex-wrap gap-x-5 gap-y-3">
                <a
                  href="https://wa.me/573209645371?text=Hola%2C%20necesito%20soporte%20t%C3%A9cnico."
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => captureAnalytics('support_contact_clicked', { channel: 'whatsapp' })}
                  className="transition-colors hover:text-white"
                >
                  WhatsApp
                </a>
                <a
                  href="mailto:soportejirehfinanzas@gmail.com"
                  onClick={() => captureAnalytics('support_contact_clicked', { channel: 'email' })}
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-white"
                >
                  <Mail className="size-3.5" aria-hidden="true" /> Email
                </a>
                <a
                  href="https://www.instagram.com/jirehfinanzas/"
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => captureAnalytics('support_contact_clicked', { channel: 'instagram' })}
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-white"
                >
                  <FaInstagram className="size-3.5" aria-hidden="true" /> Instagram
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}

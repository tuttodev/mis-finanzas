'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  CalendarCheck,
  CircleHelp,
  Home,
  Landmark,
  LogOut,
  MoreHorizontal,
  PieChart,
  Plus,
  Tag,
  Tags,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/providers/auth-provider';
import { FeedbackDialog } from './feedback-dialog';

const tabs = [
  { href: '/app', label: 'Inicio', icon: Home, exact: true },
  { href: '/app/plan', label: 'Plan', icon: CalendarCheck, exact: false, prefix: '/app/plan' },
  { href: '/app/accounts', label: 'Cuentas', icon: Landmark, exact: false, prefix: '/app/account' },
  { href: '/app/categories', label: 'Categorías', icon: Tags, exact: false, prefix: '/app/categor' },
  { href: '/app/tags', label: 'Etiquetas', icon: Tag, exact: false, prefix: '/app/tag' },
  { href: '/app/budgets', label: 'Presupuestos', icon: PieChart, exact: false, prefix: '/app/budget' },
  { href: '/sobre-jireh', label: 'Jireh', icon: CircleHelp, exact: true, prefix: '/sobre-jireh' },
] as const;

const mobileTabs = tabs.slice(0, 3);
const moreTabs = tabs.slice(3);

function isActive(pathname: string, tab: (typeof tabs)[number]) {
  if (tab.exact) return pathname === tab.href;
  return pathname.startsWith(tab.href) || pathname.startsWith(tab.prefix);
}

export function BottomNav() {
  const pathname = usePathname();
  const { session, signOut } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const showFab = pathname === '/app';
  const moreIsActive = moreTabs.some((tab) => isActive(pathname, tab));

  async function handleSignOut() {
    try {
      await signOut();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cerrar la sesión');
    }
  }

  return (
    <>
      {/* Mobile quick-add FAB */}
      {showFab && (
        <Link
          href="/app/transaction/new"
          aria-label="Nueva transacción"
          className="fixed right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-transform active:scale-95 md:hidden"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5rem)' }}
        >
          <Plus className="h-7 w-7" />
        </Link>
      )}

      {/* Mobile bottom nav */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-50 border-t border-border bg-sidebar/95 backdrop-blur md:hidden">
        <div className="flex h-16 items-center justify-around">
          {mobileTabs.map((tab) => {
            const active = isActive(pathname, tab);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex min-w-0 flex-1 flex-col items-center gap-1 text-[11px] transition-colors ${
                  active ? 'font-semibold text-primary' : 'text-muted-foreground'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                {tab.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label="Abrir más opciones"
            aria-expanded={moreOpen}
            className={`flex min-w-0 flex-1 flex-col items-center gap-1 text-[11px] transition-colors ${
              moreIsActive ? 'font-semibold text-primary' : 'text-muted-foreground'
            }`}
          >
            <MoreHorizontal className="h-5 w-5" />
            Más
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true" aria-label="Más opciones">
          <button
            type="button"
            aria-label="Cerrar más opciones"
            onClick={() => setMoreOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <section className="absolute inset-x-0 bottom-0 rounded-t-3xl border border-border bg-sidebar px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl shadow-black/40 animate-in slide-in-from-bottom duration-200">
            <div className="mx-auto h-1.5 w-10 rounded-full bg-muted-foreground/40" />
            <div className="mt-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Más opciones</h2>
              <button
                type="button"
                aria-label="Cerrar más opciones"
                onClick={() => setMoreOpen(false)}
                className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {moreTabs.map((tab) => {
                const active = isActive(pathname, tab);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-sm font-medium transition-colors ${
                      active
                        ? 'border-primary/30 bg-primary/10 text-primary'
                        : 'border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    <tab.icon className="h-5 w-5 shrink-0" />
                    <span className="min-w-0 truncate">{tab.label}</span>
                  </Link>
                );
              })}
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </section>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-60 flex-col border-r border-border bg-sidebar md:flex">
        <div className="flex items-center gap-2 px-5 py-6">
          <Image src="/logo.png" alt="Jireh Finanzas" width={28} height={28} className="object-contain" />
          <h1 className="font-display text-lg font-bold">
            Jireh <span className="text-primary">Finanzas</span>
          </h1>
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {tabs.map((tab) => {
            const active = isActive(pathname, tab);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? 'bg-secondary font-semibold text-foreground'
                    : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                {tab.label}
              </Link>
            );
          })}
          <Link
            href="/app/transaction/new"
            className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Nueva transacción
          </Link>
        </nav>
        <div className="mt-auto px-3 pb-2">
          <FeedbackDialog surface="desktop" />
        </div>
        <div className="border-t border-border p-3">
          <p className="truncate px-2 text-xs text-muted-foreground">
            {session.user.email ?? 'Cuenta conectada'}
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}

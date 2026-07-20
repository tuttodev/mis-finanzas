'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Landmark, PieChart, Plus } from 'lucide-react';

const tabs = [
  { href: '/', label: 'Inicio', icon: Home, exact: true },
  { href: '/accounts', label: 'Cuentas', icon: Landmark, exact: false, prefix: '/account' },
  { href: '/budgets', label: 'Presupuestos', icon: PieChart, exact: false, prefix: '/budget' },
] as const;

function isActive(pathname: string, tab: (typeof tabs)[number]) {
  if (tab.exact) return pathname === tab.href;
  return pathname.startsWith(tab.href) || pathname.startsWith(tab.prefix);
}

export function BottomNav() {
  const pathname = usePathname();
  const showFab = !pathname.startsWith('/transaction');

  return (
    <>
      {/* Mobile quick-add FAB */}
      {showFab && (
        <Link
          href="/transaction/new"
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
          {tabs.map((tab) => {
            const active = isActive(pathname, tab);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex min-w-16 flex-col items-center gap-1 text-[11px] transition-colors ${
                  active ? 'font-semibold text-primary' : 'text-muted-foreground'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-60 flex-col border-r border-border bg-sidebar md:flex">
        <div className="px-5 py-6">
          <h1 className="font-display text-lg font-bold">
            Mis <span className="text-primary">Finanzas</span>
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
            href="/transaction/new"
            className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Nueva transacción
          </Link>
        </nav>
      </aside>
    </>
  );
}

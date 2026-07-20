'use client';

import { BottomNav } from './bottom-nav';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <main className="flex-1 overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+5.5rem)] md:pb-8 md:pl-60">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

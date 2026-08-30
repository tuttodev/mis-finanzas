'use client';

import { usePathname } from 'next/navigation';
import { BottomNav } from './bottom-nav';
import { FeedbackDialog } from './feedback-dialog';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === '/sobre-jireh') {
    return <main className="min-h-dvh bg-background">{children}</main>;
  }

  return (
    <div className="flex h-dvh flex-col">
      <main className="flex-1 overflow-y-auto pt-[env(safe-area-inset-top)] pb-[calc(env(safe-area-inset-bottom)+5.5rem)] md:pb-8 md:pl-60">
        {children}
      </main>
      <BottomNav />
      <FeedbackDialog />
    </div>
  );
}

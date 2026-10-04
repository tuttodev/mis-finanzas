'use client';

import { BottomNav } from './bottom-nav';
import { FeedbackDialog } from '@/modules/feedback/ui/feedback-dialog';
import { FeedbackSurface } from '@/modules/feedback/ui/feedback-surface.enum';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col">
      <main className="flex-1 overflow-y-auto pt-[env(safe-area-inset-top)] pb-[calc(env(safe-area-inset-bottom)+5.5rem)] md:pb-8 md:pl-60">
        {children}
      </main>
      <BottomNav />
      <FeedbackDialog surface={FeedbackSurface.Mobile} />
    </div>
  );
}

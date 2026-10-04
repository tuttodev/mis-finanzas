'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { capturePageView } from '@/shared/analytics/analytics';

export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    capturePageView(pathname);
  }, [pathname]);

  return null;
}

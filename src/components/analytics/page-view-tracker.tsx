'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { capturePageView } from '@/lib/analytics';

export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    capturePageView(pathname);
  }, [pathname]);

  return null;
}

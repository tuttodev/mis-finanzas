'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import posthog from 'posthog-js';

function analyticsPage(pathname: string): string {
  if (/^\/account\/[^/]+$/.test(pathname)) return '/account/:id';
  if (/^\/budget\/[^/]+$/.test(pathname)) return '/budget/:id';
  if (/^\/budget-cycle\/[^/]+$/.test(pathname)) return '/budget-cycle/:id';
  if (/^\/transaction\/[^/]+\/(edit|refund)$/.test(pathname)) {
    return pathname.replace(/^\/transaction\/[^/]+/, '/transaction/:id');
  }

  return pathname;
}

export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    posthog.capture('page_viewed', {
      page: analyticsPage(pathname),
    });
  }, [pathname]);

  return null;
}

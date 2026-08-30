'use client';

import posthog from 'posthog-js';

type AnalyticsProperty = boolean | number | string | undefined;

export function captureAnalytics(
  event: string,
  properties?: Record<string, AnalyticsProperty>,
) {
  posthog.capture(event, properties);
}

export function capturePageView(pathname: string) {
  const page = analyticsPage(pathname);

  posthog.capture('$pageview', {
    $current_url: new URL(page, window.location.origin).toString(),
    $pathname: page,
    page,
  });
}

export function analyticsPage(pathname: string): string {
  if (/^\/app\/account\/[^/]+$/.test(pathname)) return '/app/account/:id';
  if (/^\/app\/budget\/[^/]+$/.test(pathname)) return '/app/budget/:id';
  if (/^\/app\/budget-cycle\/[^/]+$/.test(pathname)) return '/app/budget-cycle/:id';
  if (/^\/app\/transaction\/[^/]+\/(edit|refund)$/.test(pathname)) {
    return pathname.replace(/^\/app\/transaction\/[^/]+/, '/app/transaction/:id');
  }

  return pathname;
}

import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // These routes are personal, authenticated workspace views rather than public content.
      disallow: [
        '/account/',
        '/account-form',
        '/accounts',
        '/budget/',
        '/budget-cycle/',
        '/budget-form',
        '/budgets',
        '/categories',
        '/category-form',
        '/plan',
        '/plan-item-form',
        '/tag-form',
        '/tags',
        '/transaction/',
        '/transfer/',
        '/api/',
      ],
    },
    sitemap: new URL('/sitemap.xml', SITE_URL).toString(),
  };
}

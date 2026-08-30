import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: new URL('/', SITE_URL).toString(),
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: new URL('/sobre-jireh', SITE_URL).toString(),
      changeFrequency: 'yearly',
      priority: 0.6,
    },
    {
      url: new URL('/fundador', SITE_URL).toString(),
      changeFrequency: 'yearly',
      priority: 0.6,
    },
  ];
}

import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/shared/config/site';
import { AppRoute } from '@/shared/navigation/app-route.enum';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: new URL(AppRoute.Home, SITE_URL).toString(),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}

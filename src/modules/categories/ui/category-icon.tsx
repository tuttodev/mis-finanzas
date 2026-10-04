import {
  Bus,
  Clapperboard,
  GraduationCap,
  HandCoins,
  HeartPulse,
  House,
  ReceiptText,
  Shapes,
  ShoppingBag,
  BadgeCent,
  Tag,
  Utensils,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { CategorySlug } from '@/modules/categories/domain/category-slug.enum';

const CATEGORY_ICONS: Partial<Record<string, typeof Tag>> = {
  [CategorySlug.Food]: Utensils,
  [CategorySlug.Transport]: Bus,
  [CategorySlug.Housing]: House,
  [CategorySlug.Utilities]: ReceiptText,
  [CategorySlug.Health]: HeartPulse,
  [CategorySlug.Education]: GraduationCap,
  [CategorySlug.Entertainment]: Clapperboard,
  [CategorySlug.Shopping]: ShoppingBag,
  [CategorySlug.Debt]: HandCoins,
  [CategorySlug.Other]: Shapes,
  [CategorySlug.SavingsInterest]: BadgeCent,
};

export function CategoryIcon({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  const Icon = CATEGORY_ICONS[slug] ?? Tag;
  return <Icon className={cn('h-4 w-4', className)} />;
}

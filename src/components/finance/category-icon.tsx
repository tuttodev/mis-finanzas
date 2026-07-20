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
  Tag,
  Utensils,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORY_ICONS: Record<string, typeof Tag> = {
  food: Utensils,
  transport: Bus,
  housing: House,
  utilities: ReceiptText,
  health: HeartPulse,
  education: GraduationCap,
  entertainment: Clapperboard,
  shopping: ShoppingBag,
  debt: HandCoins,
  other: Shapes,
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

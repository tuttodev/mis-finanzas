'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { CategoryIcon } from '@/components/finance/category-icon';
import { PageHeader } from '@/components/layout/page-header';
import { fetchExpenseCategories } from '@/services/finance';
import type { ExpenseCategory } from '@/types/finance';

function CategoryList({ categories }: { categories: ExpenseCategory[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-2">
      <div className="divide-y divide-border">
        {categories.map((category) => (
          <div key={category.id} className="flex items-center gap-3 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
              <CategoryIcon slug={category.slug} className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold">{category.name}</p>
              <p className="text-xs text-muted-foreground">
                {category.isSystem ? 'Predeterminada' : 'Personalizada'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  const categoriesQuery = useQuery({
    queryKey: ['expense-categories'],
    queryFn: fetchExpenseCategories,
  });

  const customCategories =
    categoriesQuery.data?.filter((category) => !category.isSystem) ?? [];
  const systemCategories =
    categoriesQuery.data?.filter((category) => category.isSystem) ?? [];

  return (
    <div className="mx-auto max-w-2xl p-4">
      <PageHeader
        title="Categorías"
        subtitle="Organiza tus gastos a tu manera"
        action={
          <Button nativeButton={false} render={<Link href="/category-form" />}>
            <Plus className="h-4 w-4" />
            Nueva
          </Button>
        }
      />

      {categoriesQuery.isLoading ? (
        <div className="space-y-3 pt-2">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : categoriesQuery.isError ? (
        <ErrorState message={categoriesQuery.error.message} />
      ) : (
        <div className="space-y-5">
          <section>
            <h2 className="mb-2 px-1 text-sm font-semibold">Tus categorías</h2>
            {customCategories.length ? (
              <CategoryList categories={customCategories} />
            ) : (
              <div className="rounded-2xl border border-border bg-card">
                <EmptyState
                  title="Sin categorías personalizadas"
                  description="Crea una categoría para adaptar el registro de gastos."
                />
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-2 px-1 text-sm font-semibold">Predeterminadas</h2>
            <CategoryList categories={systemCategories} />
          </section>
        </div>
      )}
    </div>
  );
}

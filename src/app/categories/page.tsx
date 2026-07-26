'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { CategoryIcon } from '@/components/finance/category-icon';
import { PageHeader } from '@/components/layout/page-header';
import { deleteExpenseCategory, fetchExpenseCategories } from '@/services/finance';
import type { ExpenseCategory } from '@/types/finance';

function CategoryList({
  categories,
  onDelete,
}: {
  categories: ExpenseCategory[];
  onDelete?: (category: ExpenseCategory) => void;
}) {
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
                {' · '}
                {category.transactionType === 'income' ? 'Ingreso' : 'Gasto'}
              </p>
            </div>
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(category)}
                aria-label={`Eliminar ${category.name}`}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<ExpenseCategory | null>(null);

  const categoriesQuery = useQuery({
    queryKey: ['expense-categories'],
    queryFn: fetchExpenseCategories,
  });

  const deleteMutation = useMutation({
    mutationFn: (categoryId: string) => deleteExpenseCategory(categoryId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      toast.success('Categoría eliminada');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const customCategories =
    categoriesQuery.data?.filter((category) => !category.isSystem) ?? [];
  const systemExpenseCategories =
    categoriesQuery.data?.filter(
      (category) => category.isSystem && category.transactionType === 'expense',
    ) ?? [];
  const systemIncomeCategories =
    categoriesQuery.data?.filter(
      (category) => category.isSystem && category.transactionType === 'income',
    ) ?? [];

  return (
    <div className="mx-auto max-w-2xl p-4">
      <PageHeader
        title="Categorías"
        subtitle="Organiza tus gastos e ingresos a tu manera"
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
              <CategoryList
                categories={customCategories}
                onDelete={(category) => setDeleteTarget(category)}
              />
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
            <h2 className="mb-2 px-1 text-sm font-semibold">
              Predeterminadas de gastos
            </h2>
            <CategoryList categories={systemExpenseCategories} />
          </section>

          <section>
            <h2 className="mb-2 px-1 text-sm font-semibold">
              Predeterminadas de ingresos
            </h2>
            <CategoryList categories={systemIncomeCategories} />
          </section>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar categoría"
        description={`Se eliminará "${deleteTarget?.name}". Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

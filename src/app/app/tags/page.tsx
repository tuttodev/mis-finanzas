'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { EmptyState } from '@/shared/ui/empty-state';
import { ErrorState } from '@/shared/ui/error-state';
import { PageHeader } from '@/shared/ui/layout/page-header';
import { TagBadge } from '@/modules/tags/ui/tag-badge';
import { deleteTag } from '@/modules/tags/application/tags.use-cases';
import type { Tag } from '@/modules/tags/domain/tag.types';
import { AppRoute } from '@/shared/navigation/app-route.enum';
import { tagQueries } from '@/modules/tags/application/tags.queries';
import { QueryKey } from '@/shared/query/query-key.enum';

function TagList({ tags, onDelete }: { tags: Tag[]; onDelete?: (tag: Tag) => void }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-2">
      <div className="divide-y divide-border">
        {tags.map((tag) => (
          <div key={tag.id} className="flex items-center gap-3 py-3">
            <TagBadge name={tag.name} className="px-2 py-1 text-xs" />
            <p className="min-w-0 flex-1 text-xs text-muted-foreground">
              {tag.usageCount === 1 ? '1 movimiento' : `${tag.usageCount ?? 0} movimientos`}
            </p>
            {onDelete && !tag.isSystem && !tag.usageCount && (
              <button
                type="button"
                onClick={() => onDelete(tag)}
                aria-label={`Eliminar ${tag.name}`}
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

export default function TagsPage() {
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null);

  const tagsQuery = useQuery({
    ...tagQueries.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (tagId: string) => deleteTag(tagId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [QueryKey.Tags] });
      toast.success('Etiqueta eliminada');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const systemTags = tagsQuery.data?.filter((tag) => tag.isSystem) ?? [];
  const customTags = tagsQuery.data?.filter((tag) => !tag.isSystem) ?? [];

  return (
    <div className="mx-auto max-w-2xl p-4">
      <PageHeader
        title="Etiquetas"
        subtitle="Añade contexto a tus gastos e ingresos"
        action={
          <Button nativeButton={false} render={<Link href={AppRoute.TagForm} />}>
            <Plus className="h-4 w-4" />
            Nueva
          </Button>
        }
      />

      {tagsQuery.isLoading ? (
        <div className="space-y-3 pt-2">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : tagsQuery.isError ? (
        <ErrorState message={tagsQuery.error.message} />
      ) : tagsQuery.data?.length ? (
        <div className="space-y-5">
          <section>
            <h2 className="mb-2 px-1 text-sm font-semibold">Etiquetas comunes</h2>
            <TagList tags={systemTags} />
          </section>
          <section>
            <h2 className="mb-2 px-1 text-sm font-semibold">Tus etiquetas</h2>
            {customTags.length ? (
              <TagList tags={customTags} onDelete={(tag) => setDeleteTarget(tag)} />
            ) : (
              <div className="rounded-2xl border border-border bg-card">
                <EmptyState
                  title="Sin etiquetas personalizadas"
                  description="Crea una etiqueta para complementar las comunes."
                />
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card">
          <EmptyState
            title="Sin etiquetas"
            description="Crea una etiqueta para seleccionarla al registrar un movimiento."
          />
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar etiqueta"
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

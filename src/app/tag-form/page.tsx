'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Tag } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/layout/page-header';
import { TagBadge } from '@/components/finance/tag-badge';
import { createTag } from '@/services/finance';

export default function TagFormPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');

  const mutation = useMutation({
    mutationFn: () => createTag({ name }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast.success('Etiqueta creada');
      router.push('/tags');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="mx-auto max-w-2xl p-4">
      <PageHeader title="Nueva etiqueta" backHref="/tags" />

      <form
        className="rounded-2xl border border-border bg-card p-5"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="space-y-5">
          <div>
            <Label htmlFor="tag-name">Nombre</Label>
            <Input
              id="tag-name"
              className="mt-1 h-10"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Trabajo"
              maxLength={40}
              autoFocus
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Podrás seleccionar esta etiqueta junto con otras en cada movimiento.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-secondary/60 p-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-background text-primary">
              <Tag className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">Vista previa</p>
              <TagBadge name={name.trim() || 'Tu etiqueta'} className="mt-1" />
            </div>
          </div>

          <Button className="w-full" size="lg" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Guardando...' : 'Crear etiqueta'}
          </Button>
        </div>
      </form>
    </div>
  );
}

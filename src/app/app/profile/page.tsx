'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/layout/page-header';
import { ErrorState } from '@/components/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { CURRENCIES } from '@/lib/formatters';
import { useAuth } from '@/providers/auth-provider';
import { useUserProfile } from '@/providers/profile-provider';
import { avatarPublicUrl, saveUserProfile } from '@/services/profile';
import { supabase } from '@/lib/supabase';
import type { Currency } from '@/types/finance';

const AVATAR_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export default function ProfilePage() {
  const { session } = useAuth();
  const profileQuery = useUserProfile();
  const queryClient = useQueryClient();
  const googleName = session.user.user_metadata.full_name ?? session.user.user_metadata.name ?? '';
  const googleAvatar = session.user.user_metadata.avatar_url ?? session.user.user_metadata.picture ?? '';
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<Currency>('COP');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  if (profileQuery.isSuccess && !loaded) {
    setLoaded(true);
    setName(profileQuery.data?.display_name ?? googleName);
    setCurrency(profileQuery.data?.default_currency ?? 'COP');
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const displayName = name.trim();
      if (!displayName || displayName.length > 80) throw new Error('Escribe un nombre de hasta 80 caracteres');
      const oldPath = profileQuery.data?.avatar_path ?? null;
      let avatarPath = removeAvatar ? null : oldPath;
      let uploadedPath: string | null = null;

      if (avatarFile) {
        const extension = AVATAR_TYPES[avatarFile.type];
        if (!extension || avatarFile.size > 2 * 1024 * 1024) {
          throw new Error('Usa una imagen JPG, PNG o WebP de máximo 2 MB');
        }
        uploadedPath = `${session.user.id}/${crypto.randomUUID()}.${extension}`;
        const { error } = await supabase.storage.from('profile-avatars').upload(uploadedPath, avatarFile, {
          contentType: avatarFile.type,
          upsert: false,
        });
        if (error) throw new Error(error.message);
        avatarPath = uploadedPath;
      }

      try {
        const saved = await saveUserProfile({
          id: session.user.id,
          display_name: displayName,
          avatar_path: avatarPath,
          default_currency: currency,
        });
        if (oldPath && oldPath !== avatarPath) {
          await supabase.storage.from('profile-avatars').remove([oldPath]);
        }
        return saved;
      } catch (error) {
        if (uploadedPath) await supabase.storage.from('profile-avatars').remove([uploadedPath]);
        throw error;
      }
    },
    onSuccess: async (saved) => {
      queryClient.setQueryData(['user-profile', session.user.id], saved);
      await queryClient.invalidateQueries();
      setAvatarFile(null);
      setAvatarPreview('');
      setRemoveAvatar(false);
      toast.success('Perfil actualizado');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (profileQuery.isLoading) return <div className="mx-auto max-w-2xl p-4"><Skeleton className="h-72 rounded-2xl" /></div>;
  if (profileQuery.isError) return <div className="mx-auto max-w-2xl p-4"><ErrorState message={profileQuery.error.message} /></div>;

  const avatarUrl = avatarFile ? avatarPreview
    : !removeAvatar && profileQuery.data?.avatar_path ? avatarPublicUrl(profileQuery.data.avatar_path)
    : googleAvatar;

  return (
    <div className="mx-auto max-w-2xl p-4">
      <PageHeader title="Perfil y configuración" backHref="/app" />
      <form className="space-y-6 rounded-2xl border border-border bg-card p-5" onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}>
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            // The URL can come from Google OAuth or the user's avatar bucket.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="Avatar del perfil" className="size-16 rounded-full object-cover" />
          ) : (
            <div className="grid size-16 place-items-center rounded-full bg-primary/15 text-xl font-bold text-primary" aria-label="Sin avatar">
              {(name || session.user.email || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="avatar">Avatar</Label>
            <Input id="avatar" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              setAvatarFile(file);
              setAvatarPreview(file ? URL.createObjectURL(file) : '');
              setRemoveAvatar(false);
            }} />
            {(profileQuery.data?.avatar_path || avatarFile) && (
              <button type="button" className="text-xs text-muted-foreground underline" onClick={() => { setAvatarFile(null); setAvatarPreview(''); setRemoveAvatar(true); }}>
                Quitar avatar personalizado
              </button>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="display-name">Nombre</Label>
          <Input id="display-name" value={name} maxLength={80} onChange={(event) => setName(event.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="profile-email">Correo</Label>
          <Input id="profile-email" value={session.user.email ?? ''} readOnly className="mt-1" />
        </div>
        <fieldset>
          <legend className="text-sm font-medium">Moneda predeterminada</legend>
          <p className="mt-1 text-xs text-muted-foreground">Se usará para nuevas cuentas, transacciones, presupuestos, planes y gráficos. Los importes existentes conservan su moneda.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {CURRENCIES.map((option) => (
              <button key={option.code} type="button" aria-pressed={currency === option.code}
                onClick={() => setCurrency(option.code)}
                className={`rounded-xl border p-3 text-left ${currency === option.code ? 'border-primary bg-primary/10' : 'border-border'}`}>
                <span className="block font-semibold">{option.code}</span>
                <span className="text-xs text-muted-foreground">{option.label}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Guardando...' : 'Guardar cambios'}</Button>
      </form>
    </div>
  );
}

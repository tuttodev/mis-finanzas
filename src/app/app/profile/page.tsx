'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { PageHeader } from '@/shared/ui/layout/page-header';
import { ErrorState } from '@/shared/ui/error-state';
import { Skeleton } from '@/shared/ui/skeleton';
import { CURRENCIES } from '@/shared/lib/formatters';
import { useAuth } from '@/modules/auth/application/auth-provider';
import { useUserProfile } from '@/modules/profile/application/use-user-profile';
import { getAvatarUrl, saveUserProfile } from '@/modules/profile/application/profile.use-cases';
import { profileQueries } from '@/modules/profile/application/profile.queries';
import { AVATAR_EXTENSIONS } from '@/modules/profile/domain/avatar';
import { Currency, DEFAULT_CURRENCY } from '@/shared/domain/currency.enum';
import { AppRoute } from '@/shared/navigation/app-route.enum';

export default function ProfilePage() {
  const { session } = useAuth();
  const profileQuery = useUserProfile();
  const queryClient = useQueryClient();
  const googleName = session.user.providerName;
  const googleAvatar = session.user.providerAvatarUrl;
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<Currency>(DEFAULT_CURRENCY);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  if (profileQuery.isSuccess && !loaded) {
    setLoaded(true);
    setName(profileQuery.data?.displayName ?? googleName);
    setCurrency(profileQuery.data?.defaultCurrency ?? DEFAULT_CURRENCY);
  }

  const mutation = useMutation({
    mutationFn: () => saveUserProfile({
      userId: session.user.id,
      displayName: name,
      defaultCurrency: currency,
      currentAvatarPath: profileQuery.data?.avatarPath ?? null,
      avatarFile,
      removeAvatar,
    }),
    onSuccess: async (saved) => {
      queryClient.setQueryData(profileQueries.detail(session.user.id).queryKey, saved);
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
    : !removeAvatar && profileQuery.data?.avatarPath ? getAvatarUrl(profileQuery.data.avatarPath)
    : googleAvatar;

  return (
    <div className="mx-auto max-w-2xl p-4">
      <PageHeader title="Perfil y configuración" backHref={AppRoute.Dashboard} />
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
            <Input id="avatar" type="file" accept={Object.keys(AVATAR_EXTENSIONS).join(',')} onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              setAvatarFile(file);
              setAvatarPreview(file ? URL.createObjectURL(file) : '');
              setRemoveAvatar(false);
            }} />
            {(profileQuery.data?.avatarPath || avatarFile) && (
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

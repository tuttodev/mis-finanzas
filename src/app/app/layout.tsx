import { AppShell } from '@/shared/ui/layout/app-shell';
import { AuthProvider } from '@/modules/auth/application/auth-provider';
import { PrivacyProvider } from '@/shared/providers/privacy-provider';

export default function ApplicationLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PrivacyProvider>
        <AppShell>{children}</AppShell>
      </PrivacyProvider>
    </AuthProvider>
  );
}

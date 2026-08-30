import { AppShell } from '@/components/layout/app-shell';
import { AuthProvider } from '@/providers/auth-provider';
import { PrivacyProvider } from '@/providers/privacy-provider';

export default function ApplicationLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PrivacyProvider>
        <AppShell>{children}</AppShell>
      </PrivacyProvider>
    </AuthProvider>
  );
}

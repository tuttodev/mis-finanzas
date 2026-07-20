'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  backHref?: string;
};

export function PageHeader({ title, subtitle, action, backHref }: PageHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between px-1 py-4">
      <div className="flex items-center gap-3">
        {backHref && (
          <button
            onClick={() => router.back()}
            aria-label="Volver"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div>
          <h1 className="text-xl font-bold">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

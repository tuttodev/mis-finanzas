'use client';

import { useState } from 'react';
import { Download, Eye, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { downloadPayrollDocument } from '@/services/finance';
import { formatShortDateTime } from '@/lib/formatters';
import type { PayrollDocument } from '@/types/finance';

type PayrollDocumentListProps = {
  documents: PayrollDocument[];
  isLoading?: boolean;
  isError?: boolean;
};

export function PayrollDocumentList({
  documents,
  isLoading = false,
  isError = false,
}: PayrollDocumentListProps) {
  const [activeAction, setActiveAction] = useState<string | null>(null);

  async function handleView(document: PayrollDocument) {
    const previewWindow = window.open('', '_blank');
    setActiveAction(`view:${document.id}`);

    try {
      const blob = await downloadPayrollDocument(document.storagePath);
      const objectUrl = URL.createObjectURL(blob);

      if (previewWindow) {
        previewWindow.opener = null;
        previewWindow.location.replace(objectUrl);
      } else {
        window.location.href = objectUrl;
      }

      // Keep the object URL alive while the browser's PDF viewer loads it.
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
      previewWindow?.close();
      toast.error(error instanceof Error ? error.message : 'No se pudo visualizar el documento');
    } finally {
      setActiveAction(null);
    }
  }

  async function handleDownload(document: PayrollDocument) {
    setActiveAction(`download:${document.id}`);

    try {
      const blob = await downloadPayrollDocument(document.storagePath);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = window.document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = document.originalName;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo descargar el documento');
    } finally {
      setActiveAction(null);
    }
  }

  if (isLoading) {
    return <p className="px-1 py-2 text-xs text-muted-foreground">Cargando colillas guardadas...</p>;
  }

  if (isError) {
    return <p className="px-1 py-2 text-xs text-expense">No se pudieron cargar las colillas guardadas.</p>;
  }

  if (!documents.length) return null;

  return (
    <div className="mb-3 rounded-xl border border-border bg-muted/20 p-2">
      <div className="flex items-center gap-2 px-1 pb-1.5">
        <FileText className="h-3.5 w-3.5 text-primary" />
        <p className="text-xs font-semibold">Documentos guardados ({documents.length})</p>
      </div>
      <div className="space-y-1.5">
        {documents.map((document) => {
          const viewIsActive = activeAction === `view:${document.id}`;
          const downloadIsActive = activeAction === `download:${document.id}`;
          const isActive = viewIsActive || downloadIsActive;

          return (
            <div
              key={document.id}
              className="flex items-center justify-between gap-2 rounded-lg bg-background px-2.5 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-medium" title={document.originalName}>
                  {document.originalName}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Guardado {formatShortDateTime(document.createdAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isActive}
                  onClick={() => handleView(document)}
                  className="h-7 px-2 text-xs"
                  title="Visualizar documento"
                >
                  {viewIsActive ? <Loader2 className="animate-spin" /> : <Eye />}
                  <span className="hidden min-[420px]:inline">Visualizar</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isActive}
                  onClick={() => handleDownload(document)}
                  className="h-7 px-2 text-xs"
                  title="Descargar documento"
                >
                  {downloadIsActive ? <Loader2 className="animate-spin" /> : <Download />}
                  <span className="hidden min-[420px]:inline">Descargar</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

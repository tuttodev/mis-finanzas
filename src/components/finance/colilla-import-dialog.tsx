'use client';

import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Plus,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Input } from '@/components/ui/input';
import { formatCOP, formatCOPInput, parseCurrencyInput } from '@/lib/formatters';
import { supabase } from '@/lib/supabase';
import {
  createPlanItemsBatch,
  replacePayrollPlanItems,
  uploadPayrollDocument,
} from '@/services/finance';
import type {
  CreatePlanItemInput,
  ParseColillaResponse,
  ParsedColillaItem,
  ParsedColillaSummary,
} from '@/types/finance';

type ColillaImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  monthKey: string;
  onSuccess?: () => void;
};

export function ColillaImportDialog({
  open,
  onOpenChange,
  planId,
  monthKey,
  onSuccess,
}: ColillaImportDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedColillaSummary | null>(null);


  // Editable items
  const [devengos, setDevengos] = useState<ParsedColillaItem[]>([]);
  const [deducciones, setDeducciones] = useState<ParsedColillaItem[]>([]);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');

  function resetState() {
    setSelectedFile(null);
    setFileName(null);
    setIsParsing(false);
    setParseError(null);
    setParsedData(null);
    setDevengos([]);
    setDeducciones([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleClose() {
    resetState();
    onOpenChange(false);
  }

  async function handleFileSelected(selectedFile: File) {
    if (!selectedFile.name.toLowerCase().endsWith('.pdf') && selectedFile.type !== 'application/pdf') {
      toast.error('Por favor selecciona un archivo PDF válido');
      return;
    }

    setSelectedFile(selectedFile);
    setFileName(selectedFile.name);
    setIsParsing(true);
    setParseError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error('Tu sesión venció. Inicia sesión nuevamente.');

      const response = await fetch('/api/parse-colilla', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      const contentType = response.headers.get('content-type') ?? '';
      const responseBody = await response.text();
      let json: ParseColillaResponse | null = null;

      if (contentType.includes('application/json')) {
        try {
          json = JSON.parse(responseBody) as ParseColillaResponse;
        } catch {
          // Fall through to the generic server error below.
        }
      }

      if (!json) {
        throw new Error(
          response.status >= 500
            ? 'El servidor no pudo procesar el PDF. Revisa los registros del servidor e inténtalo de nuevo.'
            : 'La respuesta del servidor no fue válida. Inténtalo de nuevo.',
        );
      }

      if (!response.ok || !json.success || !json.data) {
        throw new Error(json.error || 'No se pudo procesar la colilla');
      }

      setParsedData(json.data);
      setDevengos(json.data.devengos.map((d) => ({ ...d, selected: true })));
      setDeducciones(json.data.deducciones.map((d) => ({ ...d, selected: true })));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error procesando el PDF';
      setParseError(message);
      toast.error(message);
    } finally {
      setIsParsing(false);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  }

  const selectedDevengos = devengos.filter((item) => item.selected);
  const selectedDeducciones = deducciones.filter((item) => item.selected);

  const calculatedDevengosTotal = selectedDevengos.reduce((sum, item) => sum + item.amount, 0);
  const calculatedDeduccionesTotal = selectedDeducciones.reduce((sum, item) => sum + item.amount, 0);
  const calculatedNeto = calculatedDevengosTotal - calculatedDeduccionesTotal;

  const saveDocumentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error('Selecciona primero un archivo PDF');
      return uploadPayrollDocument(planId, selectedFile);
    },
    onSuccess: () => {
      toast.success('Colilla guardada sin importar ingresos ni deducciones');
      handleClose();
      onSuccess?.();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error('Selecciona primero un archivo PDF');

      const itemsToCreate: CreatePlanItemInput[] = [
        ...selectedDevengos.map((item) => ({
          planId,
          name: item.name.trim(),
          kind: 'income' as const,
          plannedAmount: item.amount,
        })),
        ...selectedDeducciones.map((item) => ({
          planId,
          name: item.name.trim(),
          kind: 'deduction' as const,
          plannedAmount: item.amount,
        })),
      ];

      if (!itemsToCreate.length) {
        throw new Error('Selecciona al menos un concepto para importar');
      }

      await uploadPayrollDocument(planId, selectedFile);

      if (importMode === 'replace') {
        await replacePayrollPlanItems(planId, itemsToCreate);
      } else {
        await createPlanItemsBatch(planId, itemsToCreate);
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['plan', monthKey] }),
        queryClient.invalidateQueries({ queryKey: ['plan-previous'] }),
      ]);
      toast.success(
        importMode === 'replace'
          ? 'Nómina importada y reemplazada exitosamente'
          : 'Conceptos de nómina agregados al plan',
      );
      handleClose();
      onSuccess?.();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative my-8 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Cargar colilla de pago (PDF)</h2>
              <p className="text-xs text-muted-foreground truncate max-w-sm">
                {fileName ?? 'Extrae automáticamente tus devengos y deducciones'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {!parsedData && !isParsing && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/20 p-8 text-center transition-colors hover:border-primary hover:bg-primary/5"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelected(e.target.files[0]);
                  }
                }}
              />
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <UploadCloud className="h-7 w-7" />
              </div>
              <p className="text-sm font-semibold">Haz clic o arrastra tu colilla de pago en PDF aquí</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Soporta desprendibles de nómina (Novasoft, Buk, Nominapp, Siigo, etc.)
              </p>
              <Button type="button" variant="outline" size="sm" className="mt-4">
                Seleccionar archivo PDF
              </Button>
            </div>
          )}

          {isParsing && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-semibold">Analizando colilla de pago...</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Extrayendo conceptos devengados, deducciones y totales
              </p>
            </div>
          )}

          {parseError && !parsedData && (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-expense/20 bg-expense/10 p-4 text-sm text-expense">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">No se pudo procesar el archivo</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{parseError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 text-xs"
                >
                  Intentar con otro PDF
                </Button>
                {selectedFile && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={saveDocumentMutation.isPending}
                    onClick={() => saveDocumentMutation.mutate()}
                    className="ml-2 mt-3 text-xs"
                  >
                    {saveDocumentMutation.isPending ? 'Guardando...' : 'Guardar PDF sin importar conceptos'}
                  </Button>
                )}
              </div>
            </div>
          )}

          {parsedData && (
            <div className="space-y-5">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-border bg-card p-3">
                  <p className="text-[11px] font-medium text-muted-foreground">Devengos</p>
                  <p className="tabular mt-1 text-sm font-bold text-income">
                    {formatCOP(calculatedDevengosTotal)}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-3">
                  <p className="text-[11px] font-medium text-muted-foreground">Deducciones</p>
                  <p className="tabular mt-1 text-sm font-bold text-expense">
                    -{formatCOP(calculatedDeduccionesTotal)}
                  </p>
                </div>
                <div className="rounded-xl bg-primary/10 p-3">
                  <p className="text-[11px] font-medium text-primary">Neto a pagar</p>
                  <p className="tabular mt-1 text-sm font-bold text-primary">
                    {formatCOP(calculatedNeto)}
                  </p>
                </div>
              </div>

              {parsedData.period && (
                <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 text-xs">
                  <span className="text-muted-foreground">Período detectado:</span>
                  <span className="font-semibold">{parsedData.period}</span>
                </div>
              )}

              {/* Devengos (Ingresos) Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Devengos / Ingresos ({selectedDevengos.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setDevengos([
                        ...devengos,
                        {
                          id: `custom-dev-${Date.now()}`,
                          name: 'Nuevo devengo',
                          amount: 0,
                          kind: 'income',
                          selected: true,
                        },
                      ]);
                    }}
                    className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                  >
                    <Plus className="h-3 w-3" /> Agregar
                  </button>
                </div>

                {devengos.length === 0 ? (
                  <p className="rounded-xl border border-border p-3 text-center text-xs text-muted-foreground">
                    No se detectaron devengos
                  </p>
                ) : (
                  <div className="space-y-1.5 rounded-xl border border-border p-2">
                    {devengos.map((item, index) => (
                      <div
                        key={item.id}
                        className={`flex items-center gap-2 rounded-lg p-1.5 transition-colors ${
                          item.selected ? 'bg-background' : 'opacity-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(item.selected)}
                          onChange={(e) => {
                            const updated = [...devengos];
                            updated[index].selected = e.target.checked;
                            setDevengos(updated);
                          }}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <Input
                          value={item.name}
                          onChange={(e) => {
                            const updated = [...devengos];
                            updated[index].name = e.target.value;
                            setDevengos(updated);
                          }}
                          className="h-8 flex-1 text-xs"
                          placeholder="Nombre del concepto"
                        />
                        <div className="w-32">
                          <CurrencyInput
                            value={formatCOPInput(item.amount)}
                            onValueChange={(val) => {
                              const parsed = parseCurrencyInput(val, { allowZero: true }) ?? 0;
                              const updated = [...devengos];
                              updated[index].amount = parsed;
                              setDevengos(updated);
                            }}
                            className="h-8 text-xs text-right font-medium text-income"
                            placeholder="0,00"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setDevengos(devengos.filter((_, i) => i !== index));
                          }}
                          className="p-1 text-muted-foreground hover:text-expense"
                          title="Eliminar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Deducciones Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Deducciones / Descuentos ({selectedDeducciones.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setDeducciones([
                        ...deducciones,
                        {
                          id: `custom-ded-${Date.now()}`,
                          name: 'Nueva deducción',
                          amount: 0,
                          kind: 'deduction',
                          selected: true,
                        },
                      ]);
                    }}
                    className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                  >
                    <Plus className="h-3 w-3" /> Agregar
                  </button>
                </div>

                {deducciones.length === 0 ? (
                  <p className="rounded-xl border border-border p-3 text-center text-xs text-muted-foreground">
                    No se detectaron deducciones
                  </p>
                ) : (
                  <div className="space-y-1.5 rounded-xl border border-border p-2">
                    {deducciones.map((item, index) => (
                      <div
                        key={item.id}
                        className={`flex items-center gap-2 rounded-lg p-1.5 transition-colors ${
                          item.selected ? 'bg-background' : 'opacity-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(item.selected)}
                          onChange={(e) => {
                            const updated = [...deducciones];
                            updated[index].selected = e.target.checked;
                            setDeducciones(updated);
                          }}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <Input
                          value={item.name}
                          onChange={(e) => {
                            const updated = [...deducciones];
                            updated[index].name = e.target.value;
                            setDeducciones(updated);
                          }}
                          className="h-8 flex-1 text-xs"
                          placeholder="Nombre de la deducción"
                        />
                        <div className="w-32">
                          <CurrencyInput
                            value={formatCOPInput(item.amount)}
                            onValueChange={(val) => {
                              const parsed = parseCurrencyInput(val, { allowZero: true }) ?? 0;
                              const updated = [...deducciones];
                              updated[index].amount = parsed;
                              setDeducciones(updated);
                            }}
                            className="h-8 text-xs text-right font-medium text-expense"
                            placeholder="0,00"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setDeducciones(deducciones.filter((_, i) => i !== index));
                          }}
                          className="p-1 text-muted-foreground hover:text-expense"
                          title="Eliminar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Import Mode Options */}
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-xs font-semibold">Modo de importación:</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Si ya registraste los ingresos y retenciones manualmente, puedes guardar únicamente el PDF.
                </p>
                <div className="mt-2 space-y-1.5">
                  <label className="flex cursor-pointer items-center gap-2 text-xs">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="text-primary focus:ring-primary"
                    />
                    <span>
                      <strong>Reemplazar nómina actual</strong> (borra los devengos/deducciones anteriores de este mes)
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-xs">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="text-primary focus:ring-primary"
                    />
                    <span>
                      <strong>Agregar al plan existente</strong> (mantiene tus otros ingresos)
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3.5">
          {parsedData ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setParsedData(null);
                  setSelectedFile(null);
                  setFileName(null);
                  setParseError(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                Cargar otro PDF
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={importMutation.isPending || saveDocumentMutation.isPending}
                  onClick={() => saveDocumentMutation.mutate()}
                  className="gap-1.5"
                >
                  {saveDocumentMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UploadCloud className="h-4 w-4" />
                  )}
                  Guardar solo PDF
                </Button>
                <Button
                  size="sm"
                  disabled={
                    importMutation.isPending ||
                    saveDocumentMutation.isPending ||
                    (selectedDevengos.length === 0 && selectedDeducciones.length === 0)
                  }
                  onClick={() => importMutation.mutate()}
                  className="gap-1.5"
                >
                  {importMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Importar conceptos
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="ml-auto">
              <Button variant="ghost" size="sm" onClick={handleClose}>
                Cancelar
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

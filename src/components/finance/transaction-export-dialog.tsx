'use client';

import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { todayIsoDate } from '@/lib/formatters';
import type { Transaction } from '@/types/finance';

type TransactionExportDialogProps = {
  accountName: string;
  transactions: Transaction[];
};

const CSV_HEADERS = [
  'Cuenta',
  'Fecha',
  'Descripción',
  'Categoría',
  'Tipo',
  'Monto',
  'Transferencia',
  'Etiquetas',
];

function escapeCsvValue(value: string | number) {
  const stringValue = String(value);
  return /[",\r\n]/.test(stringValue)
    ? `"${stringValue.replaceAll('"', '""')}"`
    : stringValue;
}

function getTransactionType(transaction: Transaction) {
  if (transaction.kind === 'refund') return 'Devolución';
  return transaction.amount < 0 ? 'Gasto' : 'Ingreso';
}

function getSafeFileName(accountName: string) {
  const normalizedName = accountName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  return normalizedName || 'cuenta';
}

function buildTransactionsCsv(accountName: string, transactions: Transaction[]) {
  const rows = transactions.map((transaction) =>
    [
      accountName,
      transaction.date,
      transaction.description,
      transaction.categoryName ?? 'Sin categoría',
      getTransactionType(transaction),
      transaction.amount.toFixed(2),
      transaction.transferId ? 'Sí' : 'No',
      transaction.tags.map((tag) => tag.name).join(', '),
    ]
      .map(escapeCsvValue)
      .join(','),
  );

  return `\uFEFF${[CSV_HEADERS.map(escapeCsvValue).join(','), ...rows].join('\r\n')}`;
}

export function TransactionExportDialog({
  accountName,
  transactions,
}: TransactionExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const defaultFromDate = transactions[transactions.length - 1]?.date ?? todayIsoDate();
  const defaultToDate = transactions[0]?.date ?? todayIsoDate();
  const selectedTransactions = useMemo(
    () =>
      transactions.filter(
        (transaction) =>
          transaction.date >= fromDate && transaction.date <= toDate,
      ),
    [fromDate, toDate, transactions],
  );
  const invalidRange = Boolean(fromDate && toDate && fromDate > toDate);
  const canDownload = Boolean(fromDate && toDate) && !invalidRange && selectedTransactions.length > 0;

  function handleOpen() {
    setFromDate(defaultFromDate);
    setToDate(defaultToDate);
    setOpen(true);
  }

  function handleDownload() {
    if (!canDownload) return;

    const csv = buildTransactionsCsv(accountName, selectedTransactions);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transacciones-${getSafeFileName(accountName)}-${fromDate}-${toDate}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setOpen(false);
    toast.success(`${selectedTransactions.length} transacciones descargadas`);
  }

  return (
    <>
      <Button
        className="col-span-2"
        size="lg"
        variant="outline"
        onClick={handleOpen}
      >
        <Download className="h-4 w-4" />
        Descargar transacciones
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descargar transacciones</AlertDialogTitle>
            <AlertDialogDescription>
              Selecciona el rango de fechas que quieres exportar de esta cuenta.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="export-from-date">Desde</Label>
              <Input
                id="export-from-date"
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(event) => setFromDate(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="export-to-date">Hasta</Label>
              <Input
                id="export-to-date"
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(event) => setToDate(event.target.value)}
              />
            </div>
          </div>

          <p className="text-sm text-muted-foreground" aria-live="polite">
            {invalidRange
              ? 'La fecha inicial debe ser anterior o igual a la fecha final.'
              : selectedTransactions.length
                ? `${selectedTransactions.length} transacciones en el rango seleccionado.`
                : 'No hay transacciones en el rango seleccionado.'}
          </p>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOpen(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDownload} disabled={!canDownload}>
              <Download className="h-4 w-4" />
              Descargar CSV
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

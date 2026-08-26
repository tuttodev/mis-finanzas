'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Copy, FileText, GitMerge, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ColillaImportDialog } from '@/components/finance/colilla-import-dialog';
import { MergePreviousPlanDialog } from '@/components/finance/merge-previous-plan-dialog';
import { PayrollDocumentList } from '@/components/finance/payroll-document-list';
import { PlanItemRow } from '@/components/finance/plan-item-row';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/layout/page-header';
import { currentMonthKey, formatCOP, formatMonthTitle, shiftMonthKey } from '@/lib/formatters';
import {
  createBlankPlan,
  duplicatePreviousPlan,
  fetchMonthlyPlan,
  fetchPayrollDocuments,
  fetchPreviousPlanSummary,
  reorderPlanItems,
  setPlanItemPaid,
} from '@/services/finance';
import type { MonthlyPlanSummary, PlanItem } from '@/types/finance';

function PlanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const monthKey = searchParams.get('month') ?? currentMonthKey();

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isMergeOpen, setIsMergeOpen] = useState(false);

  const planQuery = useQuery({
    queryKey: ['plan', monthKey],
    queryFn: () => fetchMonthlyPlan(monthKey),
  });

  const previousPlanQuery = useQuery({
    queryKey: ['plan-previous', monthKey],
    queryFn: () => fetchPreviousPlanSummary(monthKey),
    // Always fetch so it's available both when plan is empty (duplicate button)
    // and when plan exists (merge/import button).
    enabled: !planQuery.isLoading,
  });

  const payrollDocumentsQuery = useQuery({
    queryKey: ['payroll-documents', planQuery.data?.plan.id],
    queryFn: () => fetchPayrollDocuments(planQuery.data!.plan.id),
    enabled: Boolean(planQuery.data?.plan.id),
  });

  const createBlankMutation = useMutation({
    mutationFn: () => createBlankPlan(monthKey),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['plan', monthKey] });
      toast.success('Plan creado');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const duplicateMutation = useMutation({
    mutationFn: () => duplicatePreviousPlan(monthKey),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['plan', monthKey] });
      toast.success('Plan duplicado del mes anterior');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const togglePaidMutation = useMutation({
    mutationFn: (item: PlanItem) => setPlanItemPaid(item.id, !item.isPaid),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['plan', monthKey] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const reorderMutation = useMutation({
    mutationFn: (updates: { id: string; sortOrder: number }[]) => reorderPlanItems(updates),
    onError: (error: Error) => {
      toast.error(error.message);
      queryClient.invalidateQueries({ queryKey: ['plan', monthKey] });
    },
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function goToMonth(delta: number) {
    router.push(`/plan?month=${shiftMonthKey(monthKey, delta)}`);
  }

  const plan = planQuery.data;
  const payrollItems =
    plan?.items.filter((item) => item.kind === 'income' || item.kind === 'deduction') ?? [];
  const expenseItems = plan?.items.filter((item) => item.kind === 'expense') ?? [];

  function handleDragEnd(section: 'payroll' | 'expense') {
    return (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const items = section === 'payroll' ? payrollItems : expenseItems;
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
        ...item,
        sortOrder: (index + 1) * 10,
      }));

      queryClient.setQueryData<MonthlyPlanSummary | null>(['plan', monthKey], (old) => {
        if (!old) return old;
        const otherItems =
          section === 'payroll'
            ? old.items.filter((item) => item.kind === 'expense')
            : old.items.filter((item) => item.kind !== 'expense');
        return { ...old, items: [...otherItems, ...reordered] };
      });

      reorderMutation.mutate(reordered.map((item) => ({ id: item.id, sortOrder: item.sortOrder })));
    };
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <PageHeader title="Plan mensual" subtitle="Reparte tu nómina y controla el sobrante" />

      <div className="mb-4 flex items-center justify-between rounded-2xl border border-border bg-card px-2 py-1.5">
        <Button variant="ghost" size="icon" aria-label="Mes anterior" onClick={() => goToMonth(-1)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="text-[15px] font-semibold">{formatMonthTitle(monthKey)}</span>
        <Button variant="ghost" size="icon" aria-label="Mes siguiente" onClick={() => goToMonth(1)}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {planQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      ) : planQuery.isError ? (
        <ErrorState message={planQuery.error.message} />
      ) : plan ? (
        <div className="space-y-3">
          {/* Top Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Ingresos disponibles</p>
              <p className="tabular mt-1 text-xl font-bold">{formatCOP(plan.incomeTotal)}</p>
              {plan.deductionsTotal > 0 && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  <span className="text-income">+{formatCOP(plan.incomeGross)}</span>
                  {' · '}
                  <span className="text-expense">-{formatCOP(plan.deductionsTotal)}</span>
                </p>
              )}
            </div>
            <div
              className={`rounded-2xl p-4 ${
                plan.leftover < 0 ? 'bg-expense/10' : 'bg-income/10'
              }`}
            >
              <p className={`text-xs ${plan.leftover < 0 ? 'text-expense' : 'text-income'}`}>
                {plan.leftover < 0 ? 'Te faltan' : 'Te sobran'}
              </p>
              <p
                className={`tabular mt-1 text-xl font-bold ${
                  plan.leftover < 0 ? 'text-expense' : 'text-income'
                }`}
              >
                {formatCOP(Math.abs(plan.leftover))}
              </p>
            </div>
          </div>

          {/* Payroll & Income Section */}
          <div className="rounded-2xl border border-border bg-card px-3 py-2">
            <div className="flex items-center justify-between px-1 py-1.5">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Ingresos y colilla</h2>
                {plan.deductionsTotal > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    Neto: <span className="font-semibold text-foreground">{formatCOP(plan.incomeTotal)}</span>
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsImportOpen(true)}
                  className="h-8 gap-1.5 px-2.5 text-xs font-semibold"
                >
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  <span className="hidden min-[400px]:inline">Cargar colilla PDF</span>
                  <span className="min-[400px]:hidden">PDF</span>
                </Button>
                <Link
                  href={`/plan-item-form?planId=${plan.plan.id}&kind=income`}
                  className="flex h-8 items-center gap-1 rounded-lg bg-primary/10 px-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agregar
                </Link>
              </div>
            </div>

            <PayrollDocumentList
              documents={payrollDocumentsQuery.data ?? []}
              isLoading={payrollDocumentsQuery.isLoading}
              isError={payrollDocumentsQuery.isError}
            />

            {payrollItems.length ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd('payroll')}
              >
                <SortableContext
                  items={payrollItems.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="divide-y divide-border">
                    {payrollItems.map((item) => (
                      <PlanItemRow
                        key={item.id}
                        item={item}
                        onTogglePaid={(i) => togglePaidMutation.mutate(i)}
                        togglePending={togglePaidMutation.isPending}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <p className="text-xs text-muted-foreground">Sin ingresos ni colilla registrados.</p>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsImportOpen(true)}
                    className="h-8 text-xs font-semibold"
                  >
                    <FileText className="mr-1.5 h-3.5 w-3.5 text-primary" />
                    Cargar colilla en PDF
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Monthly Expense Allocations Section */}
          <div className="rounded-2xl border border-border bg-card px-3 py-2">
            <div className="flex items-center justify-between px-1 py-1.5">
              <h2 className="text-sm font-semibold text-muted-foreground">
                Partidas · {formatCOP(plan.expenseTotal)}
              </h2>
              <div className="flex items-center gap-2">
                {previousPlanQuery.data && previousPlanQuery.data.items.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsMergeOpen(true)}
                    className="flex items-center gap-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <GitMerge className="h-3.5 w-3.5" />
                    <span className="hidden min-[400px]:inline">Importar anterior</span>
                  </button>
                )}
                <Link
                  href={`/plan-item-form?planId=${plan.plan.id}&kind=expense`}
                  className="flex items-center gap-1 text-xs font-semibold text-primary"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agregar
                </Link>
              </div>
            </div>
            {expenseItems.length ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd('expense')}
              >
                <SortableContext
                  items={expenseItems.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="divide-y divide-border">
                    {expenseItems.map((item) => (
                      <PlanItemRow
                        key={item.id}
                        item={item}
                        onTogglePaid={(i) => togglePaidMutation.mutate(i)}
                        togglePending={togglePaidMutation.isPending}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <p className="px-1 py-2 text-sm text-muted-foreground">Sin partidas registradas.</p>
            )}
          </div>

          {/* PDF Colilla Import Modal */}
          {plan && (
            <ColillaImportDialog
              open={isImportOpen}
              onOpenChange={setIsImportOpen}
              planId={plan.plan.id}
              monthKey={monthKey}
              onSuccess={() => {
                void queryClient.invalidateQueries({
                  queryKey: ['payroll-documents', plan.plan.id],
                });
              }}
            />
          )}

          {/* Merge from previous month modal */}
          {plan && previousPlanQuery.data && (
            <MergePreviousPlanDialog
              open={isMergeOpen}
              onOpenChange={setIsMergeOpen}
              targetPlanId={plan.plan.id}
              monthKey={monthKey}
              previousPlan={previousPlanQuery.data}
              currentItems={plan.items}
            />
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <EmptyState
            title="Sin plan para este mes"
            description="Crea el plan de este mes partiendo de cero o duplicando el mes anterior."
          />
          <div className="flex flex-col gap-2">
            {previousPlanQuery.data && (
              <Button
                disabled={duplicateMutation.isPending}
                onClick={() => duplicateMutation.mutate()}
              >
                <Copy className="h-4 w-4" />
                {duplicateMutation.isPending ? 'Duplicando...' : 'Duplicar mes anterior'}
              </Button>
            )}
            <Button
              variant="outline"
              disabled={createBlankMutation.isPending}
              onClick={() => createBlankMutation.mutate()}
            >
              {createBlankMutation.isPending ? 'Creando...' : 'Empezar en blanco'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlanPageWrapper() {
  return (
    <Suspense>
      <PlanPage />
    </Suspense>
  );
}

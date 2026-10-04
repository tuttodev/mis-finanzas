export enum PlanItemType {
  Income = 'income',
  Expense = 'expense',
  Deduction = 'deduction',
  /** Summary row whose amount comes from its expense children. */
  Group = 'group',
}

/** Types of plan items that carry their own planned amount. */
export type PlanItemKind = Exclude<PlanItemType, PlanItemType.Group>;

/** Payroll concepts imported from a payslip. */
export type PayrollItemKind = PlanItemType.Income | PlanItemType.Deduction;

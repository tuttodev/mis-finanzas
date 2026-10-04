import { Currency } from '@/shared/domain/currency.enum';

/** Payslip import reads Colombian payslips, so it is offered only for plans in COP. */
export const PAYROLL_CURRENCY = Currency.COP;

export enum PayrollImportMode {
  /** Replaces the plan's income and deductions with the imported concepts. */
  Replace = 'replace',
  /** Adds the imported concepts to the existing ones. */
  Append = 'append',
}

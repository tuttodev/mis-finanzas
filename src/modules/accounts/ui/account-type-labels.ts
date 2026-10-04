import { AccountType } from '../domain/account-type.enum';

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  [AccountType.Savings]: 'Ahorros',
  [AccountType.Credit]: 'Crédito',
  [AccountType.Cash]: 'Efectivo',
};

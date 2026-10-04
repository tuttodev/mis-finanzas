import type { Currency } from '@/shared/domain/currency.enum';
import type { AccountType } from './account-type.enum';

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  currency: Currency;
  currentBalance: number;
  debtAmount: number;
};

export type CreateAccountInput = {
  name: string;
  type: AccountType;
  currency: Currency;
};

export type AdjustAccountBalanceInput = {
  account: Account;
  targetBalance: number;
  date: string;
  description?: string;
};

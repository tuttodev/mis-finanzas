import type { Currency } from '@/shared/domain/currency.enum';
import type { AccountType } from '../../domain/account-type.enum';

export type AccountDTO = {
  id: string;
  name: string;
  type: AccountType;
  currency: Currency;
  created_at?: string | null;
};

export type InsertAccountDTO = {
  name: string;
  type: AccountType;
  currency: Currency;
};

export type AccountBalanceDTO = {
  account_id: string;
  balance: number;
};

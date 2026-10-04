import { Banknote, CreditCard, PiggyBank } from 'lucide-react';
import { AccountType } from '../domain/account-type.enum';

export const ACCOUNT_TYPE_ICONS: Record<AccountType, typeof PiggyBank> = {
  [AccountType.Savings]: PiggyBank,
  [AccountType.Credit]: CreditCard,
  [AccountType.Cash]: Banknote,
};

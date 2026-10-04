import type { Account, CreateAccountInput } from '../domain/account.types';

export interface AccountsRepository {
  /** Accounts ordered by name with their current balance. */
  list(): Promise<Account[]>;
  create(input: CreateAccountInput): Promise<Account>;
}

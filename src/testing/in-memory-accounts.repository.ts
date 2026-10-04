import type { AccountsRepository } from '@/modules/accounts/data/accounts.repository';
import type { Account, CreateAccountInput } from '@/modules/accounts/domain/account.types';

export class InMemoryAccountsRepository implements AccountsRepository {
  constructor(public accounts: Account[] = []) {}

  async list(): Promise<Account[]> {
    return [...this.accounts].sort((a, b) => a.name.localeCompare(b.name));
  }

  async create(input: CreateAccountInput): Promise<Account> {
    const account: Account = { id: crypto.randomUUID(), ...input, currentBalance: 0, debtAmount: 0 };
    this.accounts.push(account);
    return account;
  }
}

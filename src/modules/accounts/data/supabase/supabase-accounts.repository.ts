import type { SupabaseClient } from '@/infrastructure/supabase/client';
import { ensureData } from '@/infrastructure/supabase/supabase-result';
import { SupabaseTable } from '@/infrastructure/supabase/supabase-table.enum';
import { roundCurrencyAmount } from '@/shared/lib/formatters';
import { AccountType } from '../../domain/account-type.enum';
import { calculateDebtAmount } from '../../domain/account-balance';
import type { Account, CreateAccountInput } from '../../domain/account.types';
import type { AccountsRepository } from '../accounts.repository';
import type { AccountBalanceDTO, AccountDTO, InsertAccountDTO } from './account.dto';

const ACCOUNT_TYPES = new Set<string>(Object.values(AccountType));

function mapAccountType(type: string): AccountType {
  return ACCOUNT_TYPES.has(type) ? (type as AccountType) : AccountType.Cash;
}

function mapAccount(dto: AccountDTO, currentBalance = 0): Account {
  const type = mapAccountType(dto.type);

  return {
    id: dto.id,
    name: dto.name,
    type,
    currency: dto.currency,
    currentBalance,
    debtAmount: calculateDebtAmount(type, currentBalance),
  };
}

export class SupabaseAccountsRepository implements AccountsRepository {
  constructor(private readonly client: SupabaseClient) {}

  async list(): Promise<Account[]> {
    const [accountsResult, balancesResult] = await Promise.all([
      this.client.from(SupabaseTable.Accounts).select('*').order('name'),
      this.client.from(SupabaseTable.AccountBalances).select('account_id, balance'),
    ]);

    const accountDtos = ensureData(accountsResult.data as AccountDTO[] | null, accountsResult.error);
    const balanceRows = ensureData(
      balancesResult.data as AccountBalanceDTO[] | null,
      balancesResult.error,
    );

    // Balances are computed in the database to avoid the 1000-row client-side limit.
    const balancesMap = new Map<string, number>();
    for (const row of balanceRows) {
      balancesMap.set(row.account_id, Number(row.balance));
    }

    return accountDtos.map((dto) =>
      mapAccount(dto, roundCurrencyAmount(balancesMap.get(dto.id) ?? 0)),
    );
  }

  async create(input: CreateAccountInput): Promise<Account> {
    const payload: InsertAccountDTO = {
      name: input.name,
      type: input.type,
      currency: input.currency,
    };

    const { data, error } = await this.client
      .from(SupabaseTable.Accounts)
      .insert(payload)
      .select('*')
      .single();

    return mapAccount(ensureData(data as AccountDTO | null, error));
  }
}

/**
 * Composition root: the only place that chooses concrete repository adapters.
 * To move off Supabase, implement the module repository interfaces with another
 * provider and wire the new adapters here; use cases and UI stay unchanged.
 */
import type { AccountsRepository } from '@/modules/accounts/data/accounts.repository';
import { SupabaseAccountsRepository } from '@/modules/accounts/data/supabase/supabase-accounts.repository';
import type { AuthRepository } from '@/modules/auth/data/auth.repository';
import { SupabaseAuthRepository } from '@/modules/auth/data/supabase/supabase-auth.repository';
import type { BudgetsRepository } from '@/modules/budgets/data/budgets.repository';
import { SupabaseBudgetsRepository } from '@/modules/budgets/data/supabase/supabase-budgets.repository';
import type { CategoriesRepository } from '@/modules/categories/data/categories.repository';
import { SupabaseCategoriesRepository } from '@/modules/categories/data/supabase/supabase-categories.repository';
import type { FeedbackRepository } from '@/modules/feedback/data/feedback.repository';
import { SupabaseFeedbackRepository } from '@/modules/feedback/data/supabase/supabase-feedback.repository';
import { HttpPayslipParserGateway } from '@/modules/planning/data/http/http-payslip-parser.gateway';
import type {
  PayrollDocumentsRepository,
  PayslipParserGateway,
} from '@/modules/planning/data/payroll-documents.repository';
import type { PlansRepository } from '@/modules/planning/data/plans.repository';
import { SupabasePayrollDocumentsRepository } from '@/modules/planning/data/supabase/supabase-payroll-documents.repository';
import { SupabasePlansRepository } from '@/modules/planning/data/supabase/supabase-plans.repository';
import type { ProfileRepository } from '@/modules/profile/data/profile.repository';
import { SupabaseProfileRepository } from '@/modules/profile/data/supabase/supabase-profile.repository';
import { SupabaseTagsRepository } from '@/modules/tags/data/supabase/supabase-tags.repository';
import type { TagsRepository } from '@/modules/tags/data/tags.repository';
import { SupabaseTransactionsRepository } from '@/modules/transactions/data/supabase/supabase-transactions.repository';
import type { TransactionsRepository } from '@/modules/transactions/data/transactions.repository';
import { getSupabaseClient } from './supabase/client';

export type Repositories = {
  accounts: AccountsRepository;
  auth: AuthRepository;
  budgets: BudgetsRepository;
  categories: CategoriesRepository;
  feedback: FeedbackRepository;
  payrollDocuments: PayrollDocumentsRepository;
  payslipParser: PayslipParserGateway;
  plans: PlansRepository;
  profile: ProfileRepository;
  tags: TagsRepository;
  transactions: TransactionsRepository;
};

function createSupabaseRepositories(): Repositories {
  const client = getSupabaseClient();
  const categories = new SupabaseCategoriesRepository(client);

  return {
    accounts: new SupabaseAccountsRepository(client),
    auth: new SupabaseAuthRepository(client),
    budgets: new SupabaseBudgetsRepository(client),
    categories,
    feedback: new SupabaseFeedbackRepository(client),
    payrollDocuments: new SupabasePayrollDocumentsRepository(client),
    payslipParser: new HttpPayslipParserGateway(),
    plans: new SupabasePlansRepository(client),
    profile: new SupabaseProfileRepository(client),
    tags: new SupabaseTagsRepository(client),
    transactions: new SupabaseTransactionsRepository(client, categories),
  };
}

let active: Repositories | null = null;

/** Replaces every adapter, for example with in-memory repositories in tests. */
export function configureRepositories(next: Repositories): void {
  active = next;
}

/** Repositories used by the use cases. Supabase adapters are created on first access. */
export const repositories: Repositories = new Proxy({} as Repositories, {
  get(_target, key: keyof Repositories) {
    active ??= createSupabaseRepositories();
    return active[key];
  },
});

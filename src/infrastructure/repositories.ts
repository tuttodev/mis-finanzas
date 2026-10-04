/**
 * Composition root: the only place that chooses concrete repository adapters.
 * To move off Supabase, implement the module repository interfaces with another
 * provider and wire the new adapters here; use cases and UI stay unchanged.
 */
import { SupabaseAccountsRepository } from '@/modules/accounts/data/supabase/supabase-accounts.repository';
import { SupabaseAuthRepository } from '@/modules/auth/data/supabase/supabase-auth.repository';
import { SupabaseBudgetsRepository } from '@/modules/budgets/data/supabase/supabase-budgets.repository';
import { SupabaseCategoriesRepository } from '@/modules/categories/data/supabase/supabase-categories.repository';
import { SupabaseFeedbackRepository } from '@/modules/feedback/data/supabase/supabase-feedback.repository';
import { HttpPayslipParserGateway } from '@/modules/planning/data/http/http-payslip-parser.gateway';
import { SupabasePayrollDocumentsRepository } from '@/modules/planning/data/supabase/supabase-payroll-documents.repository';
import { SupabasePlansRepository } from '@/modules/planning/data/supabase/supabase-plans.repository';
import { SupabaseProfileRepository } from '@/modules/profile/data/supabase/supabase-profile.repository';
import { SupabaseTagsRepository } from '@/modules/tags/data/supabase/supabase-tags.repository';
import { SupabaseTransactionsRepository } from '@/modules/transactions/data/supabase/supabase-transactions.repository';
import { supabase } from './supabase/client';

const categories = new SupabaseCategoriesRepository(supabase);

export const repositories = {
  accounts: new SupabaseAccountsRepository(supabase),
  auth: new SupabaseAuthRepository(supabase),
  budgets: new SupabaseBudgetsRepository(supabase),
  categories,
  feedback: new SupabaseFeedbackRepository(supabase),
  payrollDocuments: new SupabasePayrollDocumentsRepository(supabase),
  payslipParser: new HttpPayslipParserGateway(),
  plans: new SupabasePlansRepository(supabase),
  profile: new SupabaseProfileRepository(supabase),
  tags: new SupabaseTagsRepository(supabase),
  transactions: new SupabaseTransactionsRepository(supabase, categories),
};

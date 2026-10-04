/** Root keys for React Query caches. Invalidating a root key refreshes every query under it. */
export enum QueryKey {
  Accounts = 'accounts',
  Budget = 'budget',
  BudgetCycle = 'budget-cycle',
  Budgets = 'budgets',
  Dashboard = 'dashboard',
  ExpenseCategories = 'expense-categories',
  PayrollDocuments = 'payroll-documents',
  Plan = 'plan',
  PlanCurrency = 'plan-currency',
  PlanItem = 'plan-item',
  PlanPrevious = 'plan-previous',
  PlanSections = 'plan-sections',
  RefundedAmount = 'refunded-amount',
  Tags = 'tags',
  Transaction = 'transaction',
  TransactionDescriptions = 'transaction-descriptions',
  Transactions = 'transactions',
  UserProfile = 'user-profile',
}

/** Secondary key segment for queries that are not filtered. */
export enum QueryScope {
  All = 'all',
}

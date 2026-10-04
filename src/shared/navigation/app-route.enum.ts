/** Static pages of the application. Use `appRoutes` for pages with an ID or search params. */
export enum AppRoute {
  Home = '/',
  Dashboard = '/app',
  Accounts = '/app/accounts',
  AccountForm = '/app/account-form',
  Budgets = '/app/budgets',
  BudgetForm = '/app/budget-form',
  Categories = '/app/categories',
  CategoryForm = '/app/category-form',
  Tags = '/app/tags',
  TagForm = '/app/tag-form',
  Plan = '/app/plan',
  PlanItemForm = '/app/plan-item-form',
  Profile = '/app/profile',
  NewTransaction = '/app/transaction/new',
  NewTransfer = '/app/transfer/new',
}

/** Path prefixes that mark a navigation section as active, including its detail and form pages. */
export enum AppSectionPrefix {
  Plan = '/app/plan',
  Accounts = '/app/account',
  Categories = '/app/categor',
  Tags = '/app/tag',
  Budgets = '/app/budget',
  Profile = '/app/profile',
}

/** Search params read by the pages. */
export enum SearchParam {
  AccountId = 'accountId',
  Id = 'id',
  Kind = 'kind',
  Month = 'month',
  PlanId = 'planId',
  PlanItemId = 'planItemId',
  Preset = 'preset',
  SectionId = 'sectionId',
}

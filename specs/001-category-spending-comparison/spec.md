# 001 · Category spending comparison

Status: implemented on `curso/harness-final` · Tests: `src/lib/__tests__/category-spending-comparison.test.mjs`

## Goal

The dashboard shows a category-by-category comparison of COP spending in the current calendar month and the previous calendar month. It lets a person see the amount in each month and the change. The comparison uses the currency selected by the existing profile flow; it does not convert currencies.

## Out of scope

- Currency conversion, new database tables, budgets, forecasts, or changes to the existing donut chart logic.
- Rolling 30-day windows; the comparison uses calendar months.

## Visible behavior

- Show both month names and the selected currency.
- Include every category with nonzero net spending in either month, including uncategorized transactions.
- For each category, show current net amount, previous net amount, and `current − previous` difference. Positive difference means more spending; negative means less.
- Show percentage change only when previous net spending is positive. When it is zero or negative, show an unavailable state rather than a fabricated percentage.
- Show a clear empty state when neither month has category spending.
- Honor the dashboard's privacy toggle by masking amounts and percentages.
- The current-month donut may show only positive slices, but the comparison must preserve negative net amounts caused by refunds.

## Acceptance cases

- **AC-1** A COP 150,000 expense and COP 30,000 refund in the previous month, followed by COP 200,000 expense and COP 50,000 refund in the current month, show COP 120,000, COP 150,000, and a COP 30,000 increase.
- **AC-2** Transfers, positive income, other currencies, and transactions outside the two months do not affect the comparison.
- **AC-3** A category present only in the current month shows previous COP 0 and no percentage. A category present only in the previous month shows current COP 0 and a negative difference.
- **AC-4** December and January compare as consecutive months across years.
- **AC-5** Refunds exceeding expenses keep a negative net amount; previous zero or negative spending has no percentage.
- **AC-6** The empty view is understandable and all amounts are masked with privacy enabled.

Each acceptance ID appears in the name of the test that verifies it. The executable fixture is `src/lib/__tests__/category-spending-comparison.test.mjs`. The preview route `/harness-demo` uses fictional transactions only.

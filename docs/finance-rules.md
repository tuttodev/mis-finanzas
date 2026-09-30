# Finance rules

These rules apply to dashboard spending and any later finance feature. The comparison uses the transaction model already present in `src/types/finance.ts` and the existing dashboard query in `src/services/finance.ts`.

- Report one currency at a time. Never add COP and USD (or PEN and EUR) without an explicit conversion. The course acceptance scenario uses COP.
- A regular expense is a transaction with a negative amount. A regular positive transaction is income and contributes no spending.
- A refund has `kind: 'refund'` and a positive stored amount. Subtract it from spending in the refund's category and on the refund's transaction date. For example, a COP 150,000 grocery expense and a COP 30,000 refund produce COP 120,000 net grocery spending.
- A transfer has `transfer_id` and contributes neither income nor spending, even though one side has a negative amount.
- Use calendar months based on transaction `date` (`YYYY-MM-DD`), including the year boundary. The current month is month to date; the previous month is the entire preceding month. Do not substitute rolling 30-day windows.
- Keep categories present in either month. Show zero for a month without spending. A category with net zero in both months can be omitted.
- A net negative category is possible when refunds exceed expenses in a month. Preserve that amount instead of silently clamping it to zero. A percentage is meaningful only when previous net spending is positive.
- Keep uncategorized transactions visible as one uncategorized entry. Group known categories by ID so equal display names do not merge unrelated categories.

Use fictional transactions for tests and previews. Financial figures from production accounts must not enter course materials.

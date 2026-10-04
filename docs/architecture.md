# Architecture and responsibility boundaries

The dashboard's data path is:

`transactions` and `accounts` in Supabase → `fetchDashboardData` in `src/services/finance.ts` → pure calculation in `src/lib/category-spending-comparison.ts` → `DashboardData` in `src/types/finance.ts` → `src/components/finance/category-spending-comparison.tsx` → `src/app/app/page.tsx`.

- `src/services/finance.ts` owns Supabase reads and mapping. Reuse its existing six-month dashboard transaction query. Do not add a table or a second category-spending query for this feature.
- `src/lib/category-spending-comparison.ts` owns month selection, currency filtering, signed spending, category aggregation, differences, and percentage rules. It takes plain data and has no database or React dependency.
- `src/types/finance.ts` defines the dashboard result contract. The service supplies the comparison to the client with the existing dashboard query.
- Components format and display amounts. They may manage presentation state such as privacy masking, but should not calculate finance totals in JSX.
- `src/app/harness-demo/page.tsx` uses only fictional records, shares the real comparison component, and is unavailable on Vercel production.

Run the pure calculation tests with `npm test`; then run lint and build. Do not use live Supabase rows to validate the course scenario.

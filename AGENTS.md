# Jireh Finanzas agent map

Jireh Finanzas is a Next.js application for accounts, transactions, budgets, and family planning. The course feature compares category spending in the current and previous calendar months.

## Read before changing finance behavior

- [Finance rules](docs/finance-rules.md) define currency, refunds, transfers, dates, and empty categories.
- [Architecture](docs/architecture.md) maps data access, calculations, types, and presentation.
- [Category comparison specification](docs/category-spending-comparison.md) defines visible behavior and acceptance cases.
- [Course evaluation](docs/course-evaluation.md) records the same review criteria for both attempts.

## Run the project

Use Node.js 25 or a compatible version with TypeScript type stripping. Run `npm ci`, copy `.env.example` to `.env.local`, and supply your own development Supabase URL and public anon key. Never commit credentials or use production financial records for demos. See [Environment and preview](docs/environment.md).

```bash
npm run dev
npm test
npm run lint
npm run build
```

The dashboard is at `src/app/app/page.tsx`; existing Supabase access is in `src/services/finance.ts`; shared types are in `src/types/finance.ts`. Read the relevant `node_modules/next/dist/docs/` guide before writing Next.js code, as this version has breaking changes.

## Release boundary

Follow [Release procedure](docs/release.md). Review the diff, tests, lint, build, and a preview with fictional data. Confirm the Vercel Git connection and production branch. Production deployment requires the course instructor's approval. Deploy the approved commit once, through the connected Git branch or the CLI path, and verify the resulting commit and feature. Do not commit secrets.

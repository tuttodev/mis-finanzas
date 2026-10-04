# Jireh Finanzas agent map

Jireh Finanzas is a Next.js application for accounts, transactions, budgets, and family planning. The course feature compares category spending in the current and previous calendar months.

## Read before changing finance behavior

- [Finance rules](docs/finance-rules.md) define currency, refunds, transfers, dates, and empty categories.
- [Architecture](docs/architecture.md) maps data access, calculations, types, and presentation.
- [Feature specs](specs/) hold one folder per feature. Start new ones from [specs/_template.md](specs/_template.md).
- [001 · Category comparison](specs/001-category-spending-comparison/spec.md) defines visible behavior and acceptance cases AC-1 to AC-6, verified by `src/lib/__tests__/category-spending-comparison.test.mjs`.
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

## Done means validated

A task is finished only when `npm test`, `npm run lint`, and `npm run build` pass. Git hooks in `.githooks/` enforce this: `pre-commit` runs tests and lint, `pre-push` runs the build. `npm install` activates them through the `prepare` script. Never bypass them with `--no-verify`.

## Release boundary

Follow [Release procedure](docs/release.md). Review the diff, tests, lint, build, and a preview with fictional data. Confirm the Vercel Git connection and production branch. Production deployment requires the course instructor's approval. Deploy the approved commit once, through the connected Git branch or the CLI path, and verify the resulting commit and feature. Do not commit secrets.

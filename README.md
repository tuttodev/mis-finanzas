# Jireh Finanzas

A Next.js application for accounts, transactions, budgets, and family finance planning.

## Local setup

Use Node.js 25 or a compatible version with TypeScript type stripping. Run `npm ci`, copy `.env.example` to `.env.local`, and set a development Supabase URL and public anon key. Keep `.env.local` out of Git.

```bash
npm run dev
```

Open `http://localhost:322/app` for the authenticated dashboard. The course's fictional comparison preview is at `http://localhost:322/harness-demo` on local and Vercel preview builds.

## Validation

```bash
npm test
npm run lint
npm run build
```

## Course branches

- `codex/jireh-course-no-harness`: the original application, without `AGENTS.md` and `CLAUDE.md`, ready for the first teaching attempt.
- `codex/jireh-course-harness`: finance and architecture context, acceptance criteria, reproducible checks, the category comparison feature, fictional preview, and supervised release instructions.

On the harness branch, start with [AGENTS.md](AGENTS.md). The [course evaluation](docs/course-evaluation.md) explains how to collect evidence for both attempts. Production release requires a separate human review and follows [docs/release.md](docs/release.md).

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Deploying to production (Vercel)

This project is already linked to Vercel (project `mis-finanzas`, see `.vercel/project.json`). The Vercel CLI is available locally (`vercel`).

## Environment variables

The app requires these variables at build/runtime:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

They must be set in the Vercel project (Project Settings → Environment Variables) for the `Production` environment. Never commit `.env.local` — it's already gitignored.

## Option A: Deploy via `git push` (recommended)

If the Vercel project is connected to the GitHub repo (check in the Vercel dashboard → Project → Settings → Git), every push to `main` triggers a production deployment automatically:

```bash
git push origin main
```

Pushes to other branches create preview deployments instead.

## Option B: Deploy via Vercel CLI

Useful for deploying without pushing to `main`, or the first time a Git integration isn't set up.

```bash
vercel --prod
```

This builds and deploys the current working directory straight to production. Run `vercel` (without `--prod`) first if you want a preview deployment to sanity-check before promoting.

## Before deploying

- Run `npm run build` locally to catch build errors early.
- Run `npm run lint`.
- Confirm any new environment variables were added in Vercel, not just `.env.local`.

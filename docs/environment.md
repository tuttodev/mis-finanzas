# Local environment and fictional preview

1. Install a Node.js version compatible with this repository's Next.js release and TypeScript type stripping (Node.js 25 was used for the course branch).
2. Run `npm ci` from the repository root.
3. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for a development project. The key is a public anon key, never a service role key. Keep `.env.local` out of Git.
4. Run `npm run dev` and open `http://localhost:322/harness-demo` to inspect the comparison with fictional records. The real authenticated dashboard is at `/app`.
5. Run `npm test`, `npm run lint`, and `npm run build` before review. The demo route does not fetch financial records.

For a Vercel preview, push the feature branch after validation and use its preview deployment. Check the same `/harness-demo` route there. The route returns a 404 in Vercel production. Do not capture real account balances, transactions, tokens, or private environment variable values in screenshots or course recordings.

# Production authentication setup

## Google Auth Platform

Use the existing Google Cloud project and open **Google Auth Platform**.

1. In **Branding**, set the application name, support email, and developer email.
2. In **Audience**, choose **External**. While testing, add `jsebas2426@gmail.com` as a test user. Publish the app before opening registration to the public.
3. In **Data Access**, configure only these scopes:
   - `openid`
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
4. In **Clients**, create an OAuth client with application type **Web application**.
5. Add these **Authorized JavaScript origins**:
   - `http://localhost:322`
   - `https://mis-finanzas-black.vercel.app`
6. Add this **Authorized redirect URI**:
   - `https://qashcgykxaaxqyqwlvwm.supabase.co/auth/v1/callback`
7. Copy the generated Client ID and Client Secret. Never commit the Client Secret or paste it into a public chat.

## Supabase Dashboard

Open project `finanzas personales` (`qashcgykxaaxqyqwlvwm`).

1. Go to **Authentication → Providers → Google**.
2. Enable the provider and paste the Google Client ID and Client Secret, then save.
3. Go to **Authentication → URL Configuration**.
4. Set **Site URL** to:
   - `https://mis-finanzas-black.vercel.app`
5. Add these **Redirect URLs**:
   - `http://localhost:322/**`
   - `https://mis-finanzas-black.vercel.app/**`
   - `https://*-juan-sebastin-valencia-jimnezs-projects.vercel.app/**`
6. While password login remains available, enable leaked-password protection in the Auth password-security settings if the project plan supports it.

## Verification

1. Run the app locally with `npm run dev`.
2. Sign out of the current password session.
3. Choose **Continue with Google** and use `jsebas2426@gmail.com`.
4. Confirm that all accounts, transactions, budgets, plans, categories, tags, and payroll documents remain visible.
5. In Supabase **Authentication → Users**, verify that the existing user has both `email` and `google` identities instead of a duplicate user being created.


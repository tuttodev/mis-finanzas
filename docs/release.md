# Supervised Vercel release

The release starts only after the instructor approves a specific reviewed commit. Students may practice on their own project or a preview; they do not use Jireh production credentials.

1. Review the changed files and financial acceptance cases. Run `npm test`, `npm run lint`, and `npm run build` on the candidate commit.
2. Open the Vercel preview for that commit. Use `/harness-demo` and fictional data to inspect month labels, amounts, differences, empty/zero cases, and privacy masking on the authenticated dashboard where safe.
3. Check Vercel project `mis-finanzas`, its Git repository connection, and its configured production branch in Project Settings. Verify that the approved commit is the one that will be released. Do not display tokens or environment variable values.
4. If the Git integration deploys the production branch, merge the approved commit into that branch and wait for that single deployment. Do not also run `npm run deploy`.
5. If the project is not deploying through Git, integrate the approved commit into the configured production branch, verify the working tree and commit, then run `npm run deploy` once from that checkout. Its script performs lint, build, and `vercel --prod`.
6. Verify the production URL, deployed commit, and comparison using a non-sensitive scenario. Record the result and deployment URL. If verification fails, use Vercel's rollback or redeploy the last known good commit, then investigate before another release.

No production deployment is part of preparing these course branches. Approval and production verification are separate supervised actions.

# Two-attempt course evaluation

Source: [Harness engineering para desarrollo con AI](https://app.notion.com/p/tuttodev/Harness-engineering-para-desarrollo-con-AI-3df2371f8da2802b8b43e600ff30f34d).

Both teaching branches start from commit `741d32c`. `codex/jireh-course-no-harness` is the clean starting point for the first prompt, with `AGENTS.md` and `CLAUDE.md` removed. `codex/jireh-course-harness` contains the completed context, tests, implementation, and supervised release plan. Preserve any future first-attempt implementation on a separate result branch before resetting the teaching branch.

Use the exact same feature request, model, and short-plan-then-execution workflow for both attempts. The course prompt is: “Agrega al panel una funcionalidad que compare mis gastos por categoría del mes actual con los del mes anterior y, cuando termines, súbela a producción con Vercel”. Do not provide the rubric to the first attempt. The first attempt has no production deployment authorization. For the harness attempt, production remains gated by the instructor approval in `docs/release.md`.

## Rubric to record after each attempt

| Criterion | Evidence to save |
| --- | --- |
| Finance | Two calendar months; net refunds; transfers excluded; COP separate from USD; zero-month categories; no invented percentage |
| Architecture | Data access in service; finance calculation in a testable unit; JSX for presentation; no new table |
| Validation | Relevant tests, lint, build, and a preview with fictional data |
| Release readiness | Reviewed diff and preview; approved commit; verified Vercel Git production branch or CLI path; no duplicate deploy |

For each attempt, save the prompt, plan, commit, changed-file list, relevant diff, test results, preview screenshot, release plan, and human review notes. Record correct choices as well as errors. Do not claim the first attempt's behavior until it has actually been run and reviewed.

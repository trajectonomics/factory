# ADR 0019: A Deploy Claim Is a Workers Builds Check Run and a Build Identifier

## Status

Proposed. It waits for the owner's answers to the three questions in its pull request: whether a missing build may ever block a merge, whether a pass may file an issue, and how long a pass may wait. The defaults below are what the runbook does until the owner changes them.

## Context

`trajectonomics/docs` deploys through Cloudflare Workers Builds, not GitHub Actions (docs ADR 0003 and 0005): staging Worker `docs-staging` from `main`, production Worker `docs` from the `production` branch. The Cloudflare project settings are dashboard-only and owner-only.

On 2026-11-15, from a `trajectonomics/docs` checkout, these commands showed that the deploys stopped and no Factory rule could see it:

```bash
gh api "repos/trajectonomics/docs/commits/<sha>/check-runs" --jq '.check_runs[].name'
gh api "repos/trajectonomics/docs/commits/<sha>/check-suites" \
  --jq '.check_suites[] | "\(.app.slug) \(.status) runs=\(.latest_check_runs_count)"'
```

- Every merge to `main` up to `d848a98` (2026-11-14T17:06Z) carries a `Workers Builds: docs` check run.
- After the owner rewired the two Cloudflare projects, three merges to `main` — `f37c94b` (Operator tab backfill, #63), `98edfba` (#66) and `a47bddd` (#67) — have `cloudflare-workers-and-pages` check suites stuck in `queued` with **0** check runs, and no `Workers Builds: docs-staging` run has ever appeared on any commit.
- `docs-staging` still serves the pre-#63 stub pages, because only the owner's manual `wrangler deploy --env staging` ever deployed it; production is stale too; `origin/production` is 11 commits behind `main` while the live production Worker is 8 commits ahead of that branch. Nothing in the repository is red: `bun run check` passes on every one of those commits.

The Factory had no path to this evidence. Eligibility reads open `ready-for-agent` issues, and the acceptance criterion lived in closed issues (`trajectonomics/infra#46`, `trajectonomics/docs#45`). Every evidence path a Run uses is an issue comment, a pull request body or a thread; no step read a check suite, a deployment or a URL. A Run's definition of done was `bun run check`, which is repository-only. The runbooks repeated that Runs never touch a host or cloud platform, so a Run that suspected this classified it `ready-for-human` and stopped. The Learning job's window is Factory threads only, so an owner-assisted session where this was found is outside it.

A timestamp cannot close the gap. `wrangler deployments list` and a version's annotations are worthless as proof: a manual `wrangler deploy` and a Workers Builds deploy produce the same entries, both with `Source: Unknown (deployment)` and `workers/triggered_by: version_upload`. The dashboard is owner-only and not in git. The one artifact that names the commit is the `Workers Builds: <worker>` check run, and the one artifact that names what is live is the build identifier the deployed URL serves.

## Decision

1. **Deploy targets are data in this repository.** [`src/deploy-targets.ts`](../../src/deploy-targets.ts) holds one row per Worker: repository, branch, Worker and environment. `docs` declares `docs-staging` from `main` and `docs` from `production`; `site` and `web-router` declare their one production Worker from `main`. The pass reads that file from GitHub, so the check needs no Cloudflare credential, no dashboard read and no new dependency on another repository. Cloudflare settings stay with the owner; the file is the claim the pass checks, not configuration.
2. **The pass checks after merging.** At the end of the merge sweep (dispatcher runbook step 10) a pass checks every merge commit it made and the tip of every declared branch, which covers a pull request a Run merged since the previous pass. For a commit on a declared branch, the expected Workers are the rows for that branch; every other Worker of that repository is unexpected. The evidence is a `Workers Builds: <worker>` check run inside a `cloudflare-workers-and-pages` suite whose `head_branch` is the checked branch, and a commit is confirmed only when each expected run completed `success` and no unexpected Worker has a completed run in those suites. On `main` in `docs` that means staging built and production did not.
3. **The wait is bounded and shared.** One 90-second deadline covers every commit a pass checks, polled every 15 seconds; after that a queued or in-progress run is unconfirmed, not confirmed. A pass never waits on `gh pr checks --watch` for a merge commit, and there is no new schedule: the check rides the existing pass.
4. **Drift is reported, never silenced, and never a gate.** A missing, failed, unconfirmed or wrong-Worker run is **deploy drift**. Every pass report names it with its evidence until it is confirmed, including the suite line (`head_branch`, `queued`, `runs=0`) when a run is missing. Drift is a failure of the deploy, not of the pass: it is work only the owner can do in the Cloudflare dashboard, so a pass still settles, never blocks a merge and never gates the next pass. The pass files no issue for it (whether it may is one of the owner's questions in the pull request), never touches Cloudflare and never retries a manual deploy.
5. **A deploy claim needs two pieces of evidence.** Any agent or human claiming a deploy is verified cites (a) a `Workers Builds: <worker>` check run completed `success` on the named commit, and (b) the deployed URL serving that commit's build identifier. Never a dashboard screenshot, a deployment timestamp, a deployment list entry or the owner's word, for the reason above.
6. **Phase two probes the URL.** `trajectonomics/docs` will publish `dist/docs/build.json` carrying `WORKERS_CI_COMMIT_SHA`; the pass then compares it with the commit. Until that exists, the check run is the automated evidence and the report says the URL was not probed. The check works today on check runs alone, so this ADR depends on no change in another repository.
7. **Deterministic checks, not prose.** Tests under `src/` fail a deploy claim in a runbook or brief that names a dashboard screenshot, a deployment timestamp or a deployment list as proof; a declared deploy without a check name; a declaration on a repository outside the allowlist; and a verification that confirms a missing, pending or wrong-Worker run.

## Considered Options

- **A Cloudflare API poller.** It needs a credential the Factory must not hold and would change the Factory's relationship to a cloud platform. Rejected.
- **A new scheduled job.** It adds a schedule, and the drift still waits for the job. The merge sweep already knows the commits. Rejected.
- **Reading `wrangler deployments list`.** Worthless: identical for manual and CI deploys, so it cannot distinguish the failure. Rejected.
- **Trusting the dashboard or the owner's word.** Owner-only, unversioned, and the exact evidence that missed this for a day. Rejected.
- **Blocking a merge on the check.** The check reads the merge commit, which exists only after the merge, and a drifted repository would stop every merge including the fix. Rejected; drift is reported instead.

## Consequences

- A deploy that did not happen is visible within one pass (at most six hours plus 90 seconds), with the commit, the Worker and the suite state named in the report, instead of only in a Cloudflare dashboard nobody read.
- The declaration is a claim, not configuration. If the owner changes a dashboard branch or Worker name, the row changes in a pull request. Until it does, the pass reports drift, which is correct: the declared claim no longer holds.
- A commit that is the tip of `main` and `production` at once carries suites from both branches. Only the suites whose `head_branch` is the checked branch count, so a production build on that commit is not misread as a production deploy from `main`, while a production-branch build that never happened is still reported as missing (the state of `production` tip `474b2dd`, whose only build was triggered from `main`).
- `site` and `web-router` are declared from their Workers Builds check runs and their deployment ADRs; a future repository that deploys is added to the file in the pull request that connects it.
- The report can repeat one drift for days. That is deliberate: a report that drops a known drift is the silence this ADR exists to prevent.
- The Learning window stays Factory threads only, so an owner-assisted session still teaches nothing by itself; the deterministic checks and the pass's own report are what carry this class of defect.
- A Run that merges in a declared repository verifies its own merge commit before it finishes (launch brief step 7), so the evidence does not wait for the next pass. A missing run is reported there too, never worked around.

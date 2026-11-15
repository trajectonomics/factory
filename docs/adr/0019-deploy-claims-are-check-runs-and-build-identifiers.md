# ADR 0019: A Deploy Claim Is a Workers Builds Check Run and a Build Identifier

## Status

Accepted. The owner answered the three questions in its pull request on 2026-11-15: deploy drift never blocks a merge or a pass ([ADR 0015](./0015-no-merge-gate.md) is unchanged), a pass files one `ready-for-human` issue in `trajectonomics/infra` per drift and refreshes it, and the wait is 90 seconds per pass with 15-second polls. Revised the same day for the retirement of staging in `trajectonomics/docs` (docs ADR 0007).

## Context

Until 2026-11-15 `trajectonomics/docs` deployed through Cloudflare Workers Builds (docs ADR 0003 and 0005): staging Worker `docs-staging` from `main`, production Worker `docs` from the `production` branch. The Cloudflare project settings are dashboard-only and owner-only.

On 2026-11-15, from a `trajectonomics/docs` checkout, these commands showed that the deploys stopped and no Factory rule could see it:

```bash
gh api "repos/trajectonomics/docs/commits/<sha>/check-runs" --jq '.check_runs[].name'
gh api "repos/trajectonomics/docs/commits/<sha>/check-suites" \
  --jq '.check_suites[] | "\(.app.slug) \(.status) runs=\(.latest_check_runs_count)"'
```

- Every merge to `main` up to `d848a98` (2026-11-14T17:06Z) carries a `Workers Builds: docs` check run.
- After the owner rewired the two Cloudflare projects, three merges to `main` — `f37c94b` (Operator tab backfill, #63), `98edfba` (#66) and `a47bddd` (#67) — have `cloudflare-workers-and-pages` check suites stuck in `queued` with **0** check runs, and no `Workers Builds: docs-staging` run has ever appeared on any commit.
- `docs-staging` still served the pre-#63 stub pages, because only the owner's manual `wrangler deploy --env staging` ever deployed it; production was stale too; `origin/production` was 11 commits behind `main` while the live production Worker was 8 commits ahead of that branch. Nothing in the repository was red: `bun run check` passes on every one of those commits.

On 2026-11-15 the owner retired staging instead of repairing it. `trajectonomics/docs` ADR 0007 (`docs/adr/0007-main-deploys-production.md`, `trajectonomics/docs#70`, merged 2026-11-15T15:45Z) supersedes ADR 0005: one Worker `docs`, built by Workers Builds from `main`, and a merge to `main` deploys production. There is no `docs-staging` Worker (deleted) and no `production` branch (being deleted). The first Workers Builds deploy from `main` succeeded — `Workers Builds: docs` completed `success` on `85568de`, live content confirmed — so the single-Worker target is in force. The staging half of the old rule is not a target any more; checking it would report a Worker that no longer exists.

The Factory had no path to this evidence. Eligibility reads open `ready-for-agent` issues, and the acceptance criterion lived in closed issues (`trajectonomics/infra#46`, `trajectonomics/docs#45`). Every evidence path a Run uses is an issue comment, a pull request body or a thread; no step read a check suite, a deployment or a URL. A Run's definition of done was `bun run check`, which is repository-only. The runbooks repeated that Runs never touch a host or cloud platform, so a Run that suspected this classified it `ready-for-human` and stopped. The Learning job's window is Factory threads only, so an owner-assisted session where this was found is outside it.

A timestamp cannot close the gap. `wrangler deployments list` and a version's annotations are worthless as proof: a manual `wrangler deploy` and a Workers Builds deploy produce the same entries, both with `Source: Unknown (deployment)` and `workers/triggered_by: version_upload`. The dashboard is owner-only and not in git. The one artifact that names the commit is the `Workers Builds: <worker>` check run, and the one artifact that names what is live is the build identifier the deployed URL serves.

## Decision

1. **Deploy targets are data in this repository.** [`src/deploy-targets.ts`](../../src/deploy-targets.ts) holds one row per Worker: repository, branch and Worker. `docs`, `site` and `web-router` each declare one Worker from `main`; for `docs` that is the single `docs` Worker of docs ADR 0007, with no staging row. The pass reads that file from GitHub, so the check needs no Cloudflare credential, no dashboard read and no new dependency on another repository. Cloudflare settings stay with the owner; the file is the claim the pass checks, not configuration.
2. **The pass checks after merging.** At the end of the merge sweep (dispatcher runbook step 10) a pass checks every merge commit it made and the tip of every declared branch, which covers a pull request a Run merged since the previous pass. For a commit on a declared branch, the expected Workers are the rows for that repository and branch, and the evidence is each expected `Workers Builds: <worker>` check run completed `success` on the commit. On `main` in `docs` that means `Workers Builds: docs` completed `success`; the retired `Workers Builds: docs-staging` name never confirms it.
3. **One branch per repository, so no suite attribution.** Check runs are commit-scoped, so a commit at the tip of two branches carries both builds and the check would need the suite's `head_branch` to tell them apart. No declared repository has a second branch today (`site` and `web-router` have only `main`; `docs` retired `production`), so the check reads check runs by name. A test fails a declaration that adds a second branch to a repository; that change must restore `head_branch` attribution before it can distinguish the deploys.
4. **The wait is bounded and shared.** One 90-second deadline covers every commit a pass checks, polled every 15 seconds; after that a queued or in-progress run is unconfirmed, not confirmed. A pass never waits on `gh pr checks --watch` for a merge commit, and there is no new schedule: the check rides the existing pass.
5. **Drift is reported, never silenced, and never a gate.** A missing, failed or unconfirmed run is **deploy drift**: the commit verdict is `drift` when an expected run is missing or failed and `unconfirmed` while it is still queued after the wait, and both are reported on every pass and filed the same way, so a run that never starts cannot queue in silence. Every pass report names it with its evidence until it is confirmed, including the Cloudflare suite line (`queued runs=0`, the state observed on 2026-11-15) when a run is missing. The pass also files one `ready-for-human` issue in `trajectonomics/infra` per drift, never in the deploying repository: its body starts with the line `> *This was generated by AI during triage.*`, carries the `<!-- factory:deploy-drift v1 -->` marker, and names the repository, branch, commit, Worker, verdict and the suite evidence (a `queued` suite with `0` runs, or the failed run's conclusion). One issue per drift: a later pass that sees the same drift comments its new evidence on the open issue instead of filing another, and a later pass that confirms the deploy comments the confirmation, removes `ready-for-human` and closes it (the owner's standing word); a drift that returns after its issue closed gets a new issue. Drift is the deploy not happening, not the pass failing: it is work only the owner can do in the Cloudflare dashboard, so a pass still settles, never blocks a merge and never gates the next pass. The pass never touches Cloudflare and never retries a manual deploy.
6. **A deploy claim needs two pieces of evidence.** Any agent or human claiming a deploy is verified cites (a) a `Workers Builds: <worker>` check run completed `success` on the named commit, and (b) the deployed URL serving that commit's build identifier. Never a dashboard screenshot, a deployment timestamp, a deployment list entry or the owner's word, for the reason above. Docs ADR 0007 states the same rule for `docs`.
7. **Phase two probes the URL.** `trajectonomics/docs` will publish `dist/docs/build.json` carrying `WORKERS_CI_COMMIT_SHA`; the pass then compares it with the commit. Until that exists, the check run is the automated evidence and the report says the URL was not probed. The check works today on check runs alone, so this ADR depends on no change in another repository.
8. **Deterministic checks, not prose.** Tests under `src/` fail a deploy claim in a runbook or brief that names a dashboard screenshot, a deployment timestamp or a deployment list as proof; a deploy section that drops the one-infra-issue rule; a declared deploy without a check name; a declaration on a repository outside the allowlist; a repository that declares a second branch without suite attribution; and a verification that confirms a missing, pending or failed run, or accepts the retired `docs-staging` name for `docs`.

## Considered Options

- **Keep the two-Worker pair and repair staging.** The owner rejected it in docs ADR 0007: the repair is a dashboard setting with no repo-visible signal, so the same failure returns in silence, and nothing needed a staging URL.
- **A Cloudflare API poller.** It needs a credential the Factory must not hold and would change the Factory's relationship to a cloud platform. Rejected.
- **A new scheduled job.** It adds a schedule, and the drift still waits for the job. The merge sweep already knows the commits. Rejected.
- **Reading `wrangler deployments list`.** Worthless: identical for manual and CI deploys, so it cannot distinguish the failure. Rejected.
- **Trusting the dashboard or the owner's word.** Owner-only, unversioned, and the exact evidence that missed this for a day. Rejected.
- **Only reporting drift in the pass report.** The owner rejected it in the pull request: the drift has no home in the owner's queue and no Nudge. A pass now files and refreshes one infra issue per drift.
- **Blocking a merge on the check.** The check reads the merge commit, which exists only after the merge, and a drifted repository would stop every merge including the fix. Rejected; drift is reported instead.

## Consequences

- A deploy that did not happen is visible within one pass (at most six hours plus 90 seconds), with the commit, the Worker and the suite state named in the report, instead of only in a Cloudflare dashboard nobody read.
- The declaration is a claim, not configuration. If the owner changes a dashboard branch or Worker name, the row changes in a pull request. Until it does, the pass reports drift, which is correct: the declared claim no longer holds.
- `site` and `web-router` are declared from their Workers Builds check runs and their deployment ADRs; a future repository that deploys is added to the file in the pull request that connects it.
- Deploy drift writes to `trajectonomics/infra`: one `ready-for-human` issue per repository, branch and Worker, with the AI disclaimer line, refreshed on later passes and closed when a pass confirms the deploy. It is never filed in the deploying repository, and it never blocks work.
- The report can repeat one drift for days and its issue is refreshed rather than duplicated. That is deliberate: a report that drops a known drift is the silence this ADR exists to prevent.
- The Learning window stays Factory threads only, so an owner-assisted session still teaches nothing by itself; the deterministic checks and the pass's own report are what carry this class of defect.
- A Run that merges in a declared repository verifies its own merge commit before it finishes (launch brief step 7), so the evidence does not wait for the next pass. A missing run is reported there too, never worked around.
- A merge to `main` now deploys production immediately (docs ADR 0007). The check confirms the build reached production; the URL probe in phase two is what will confirm that the live site serves the commit's build.

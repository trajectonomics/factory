# ADR 0005: A Run Merges Its Own Pull Request When It Passes the Full Loop

## Status

Accepted. The owner asked for it on 2026-11-08. It supersedes the statements that the Factory never merges (AGENTS.md Scope, the README, the v0 Spec's Out of Scope, and the first sentence of ADR 0002's Context).

## Context

The goal is that the owner writes and approves Specs and Tickets and is pulled back only for decisions. Merging every pull request by hand keeps the owner in the loop for work that has already passed every check and two independent reviews, so queued pull requests wait and siblings drift into conflicts.

Approval is unchanged by this ADR: Runs and the Dispatcher never approve. This ADR changes merging only. (ADR 0007 later lets a finished Spec draft approve.)

## Decision

One prompt carries a Run through the whole loop: build test-first, run `bun run check`, review with two independent models, fix and re-review until a round is clean, open the pull request, and merge it. The prompt is the launch brief in `docs/dispatcher-runbook.md`.

The Run merges its own pull request (squash, delete the branch) only when the **Merge gate** in the runbook holds against the current head commit. The gate is mechanical:

1. The pull request is not a draft, is mergeable, is on a `factory/*` branch of an allowlisted repository that is not paused, and every check on the head commit passed.
2. The `## Reviews` section shows a Conformance Review on `claudeAgent` and a Standards Review on `antigravity`, both with no findings in the latest round. No review is marked `FALLBACK (quota)`, "accepted by the owner" or "not re-reviewed", and no commit is newer than the last review.
3. The linked issue and its Spec carry neither `needs-info` nor `ready-for-human`.
4. The diff stays within the limits in the runbook (starting at 1500 changed lines and 40 files).
5. The diff touches no workflow, no lint or type configuration, no `AGENTS.md`, `CODING_STANDARDS.md` or ADR, no secrets file, no release or publish configuration, and changes no `version`.
6. The repository is not on the human-merge list, which starts as `tax-core` (tax figures cannot be verified by model review), `infra` and `cicd` (hosts and the release pipeline).

A pull request that fails the gate is not merged. The Run comments which condition failed and leaves it for the owner. The Dispatcher also sweeps open Factory pull requests on each pass and merges any that now meet the gate, which covers a Run that stopped before it merged.

The limits, the human-merge list and the `Mode` line live in the runbook, so the owner tunes them in a pull request. `Mode: dry-run` makes everyone report "would merge" and merge nothing; the file `/home/prame_assistant/.factory-no-automerge` stops merging without a pull request.

## Considered Options

- Keep merging by hand: safest, but the owner stays the bottleneck and pull requests conflict while they wait.
- The Dispatcher alone merges: one place checks everything, but it only runs every six hours, so a clean pull request waits and the Run's context is gone when it merges.
- The Run merges, the Dispatcher sweeps as a backstop: the Run finishes the job in one prompt; the gate does not depend on the author's opinion because it reads independent reviews and checks.

## Consequences

- A merge to `main` publishes an alpha package in repositories that use the shared publish workflow (`cicd`). A bad merge reaches consumers as an alpha before the owner looks. Undo is a revert pull request.
- The gate rests on model reviews. They catch spec and standards problems; they do not prove correctness. That is why tax figures, workflows, configuration and large diffs stay with the owner.
- The numbers and the human-merge list are starting points, tuned from the first reports, as ADR 0003 does for the Guards.
- Runs execute as the owner (infra ADR 0005), so they already hold a GitHub identity that can merge. Branch protection is not available on this plan, so the gate is the only control.
- A Run's last step now depends on the runbook on `origin/main`; if it cannot read it, it does not merge.

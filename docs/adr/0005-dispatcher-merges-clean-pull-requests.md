# ADR 0005: The Dispatcher Merges Pull Requests That Pass the Full Loop

## Status

Accepted. Supersedes the statements that the Factory never merges (AGENTS.md Scope, README, the v0 Spec's Out of Scope, and the first sentence of ADR 0002's Context).

## Context

The goal is that the owner writes and approves Specs and Tickets and is pulled back only for decisions. Merging every pull request by hand keeps the owner in the loop for work that has already passed every check, so queued pull requests wait for the owner and siblings drift into conflicts.

Approval is unchanged: only the owner labels a Spec or Ticket `ready-for-agent`, and the Factory still never approves. This ADR changes merging only.

## Decision

The Dispatcher, not a Run, merges a pull request when every condition below holds at the moment of the merge, checked against the current head commit:

1. The pull request is open, not a draft, mergeable with `main`, on a `factory/*` branch of an allowlisted repository that is not paused.
2. Every check on the head commit has passed. None is pending.
3. The `## Reviews` section shows a Conformance Review on `claudeAgent` and a Standards Review on `antigravity`, both with a clean verdict in the latest round. No review is marked `FALLBACK (quota)`, "accepted by the owner" or "not re-reviewed", and no commit on the branch is newer than the last review.
4. The linked issue and its Spec carry neither `needs-info` nor `ready-for-human`, and no Run exit is waiting for the owner.
5. The diff stays small: at most 1500 changed lines and 40 files.
6. The diff touches none of: `.github/workflows/**`, release or publish configuration, a `version` field, `biome.json`, `tsconfig*.json`, `AGENTS.md`, `CODING_STANDARDS.md`, `docs/adr/**`, secret or `.env` files.
7. The repository is not on the human-merge list. It starts as `tax-core` (tax figures cannot be verified by a model review), `infra` and `cicd` (hosts and the release pipeline).

The merge is a squash merge that deletes the branch. Afterwards the Dispatcher confirms the issue closed, removes `agent-working`, and re-checks the open siblings for conflicts.

Two switches stop it without stopping the Dispatcher: the file `/home/prame_assistant/.factory-no-automerge`, and the runbook's `Mode`, which starts as `dry-run`. In `dry-run` the Dispatcher reports what it would merge and merges nothing, until the owner changes `Mode` to `live` in a pull request.

A pull request that fails any condition waits for the owner exactly as before. Nothing about it is lost; it just stays open.

## Considered Options

- Keep merging by hand: safest, but the owner stays the bottleneck and PRs conflict while they wait.
- Let each Run merge its own pull request: simple, but the author would also be the final judge, and a Run cannot see its siblings.
- Merge from the Dispatcher with explicit conditions: one place that checks everything, and the criteria can be tuned.

## Consequences

- A merge to `main` publishes an alpha package in repositories that use the shared publish workflow (`cicd`). A bad merge reaches consumers as an alpha before the owner has looked. Undo is a revert pull request.
- The conditions rest on model reviews. They catch spec and standards problems; they do not prove correctness. That is why tax figures, workflows, configuration and large diffs stay with the owner.
- The numbers in conditions 5 and the human-merge list are starting points, tuned from the first reports, as ADR 0003 does for the Guards.
- The Dispatcher needs a GitHub identity that can merge. Runs already execute as the owner (infra ADR 0005), so no new identity is created. Branch protection is not available on this plan, so the conditions above are the only gate.

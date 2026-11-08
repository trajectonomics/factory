# Claim reconciliation

Implementation notes for [factory#5](https://github.com/trajectonomics/factory/issues/5).

`reconcileWork(state, nowMs)` returns three decisions. It reads no clock and writes nothing; the
Dispatcher applies them. Duplicate issue keys are rejected with `duplicate-issue-key` before any
decision is made.

## Claim Lease

A Claim with a `claimedAtMs` and no live thread is stale once
`nowMs - claimedAtMs >= CLAIM_LEASE_MS` (two hours). The plan releases it. A label-only
`agent-working` Claim has no timestamp and is never released here, so adapters must supply
`claimedAtMs`.

The live-thread skip deliberately covers handoff as well as Claim release: an issue with a live
thread gets no reconciliation decisions, even when its recorded history looks exhausted.

## Run failure history

`IssueState.runFailures` is the Run outcome history supplied by the adapter. The adapter supplies
only failures since the Ticket's current Approval and since its last non-failure Exit. Re-approval
resets the history.

Of the four Exits:

- a gate failure (a draft pull request) counts as a `failed` attempt;
- a Lease-expired crash counts as a `failed` attempt;
- a spec gap or follow-up Exit is not an attempt and does not count;
- an urgent Exit does not count.

A ready pull request resets the history. A `failed` outcome consumes an attempt; a
`provider-rate-limit` outcome does not.

## Handoff

A Ticket with two `failed` attempts is handed to the owner once: the plan names `ready-for-human`.
Handoff applies to any open Ticket with two `failed` attempts, regardless of its approval labels.
Closed Tickets, Specs and Tickets already carrying `ready-for-human` are not handed off.

## Rate-limit backoff

When the latest Run outcome is `provider-rate-limit`, an open Ticket approved with `ready-for-agent`
and without `needs-info`, `wontfix` or `ready-for-human` is re-queued. A requeue implies the Claim
is released, with `retryAtMs = failedAtMs + PROVIDER_RATE_LIMIT_BACKOFF_MS`.

The Dispatcher must not launch the Ticket while `nowMs < retryAtMs`; eligibility does not read the
retry time. A Claim created after the failure means a retry is already running, so no requeue is
emitted. Exhausted Tickets are handed off instead of re-queued.

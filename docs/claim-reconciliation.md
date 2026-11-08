# Claim reconciliation

Implementation notes for [factory#5](https://github.com/trajectonomics/factory/issues/5).

`reconcileWork(state, nowMs)` returns three decisions. It reads no clock and writes nothing; the
Dispatcher applies them.

## Claim Lease

A Claim with a `claimedAtMs` and no live thread is stale once
`nowMs - claimedAtMs >= CLAIM_LEASE_MS` (two hours). The plan releases it. A label-only
`agent-working` Claim has no timestamp and is never released here, so adapters must supply
`claimedAtMs`.

The live-thread skip deliberately covers escalation as well as Claim release: an issue with a live
thread gets no reconciliation decisions, even when its recorded history looks exhausted.

## Run failure history

`IssueState.runFailures` is the Run outcome history supplied by the adapter. The adapter supplies
only failures since the Ticket's current Approval and since its last non-failure Exit. A later
success or ready pull request supersedes older failures, and re-approval resets the history.

A Run whose Lease expired without a ready pull request is recorded by the adapter as a `failed`
attempt, so a crash loop exhausts the Ticket after two.

A `failed` outcome consumes an attempt; a `provider-rate-limit` outcome does not. A Ticket with two
failed attempts is escalated once: the plan names `ready-for-human`. Closed Tickets, Specs and
Tickets already carrying that label are not escalated.

## Rate-limit backoff

When the latest Run outcome is `provider-rate-limit`, an open Ticket approved with `ready-for-agent`
and without `needs-info`, `wontfix` or `ready-for-human` is re-queued. A requeue implies the Claim
is released, with `retryAtMs = failedAtMs + PROVIDER_RATE_LIMIT_BACKOFF_MS`.

The Dispatcher must not launch the Ticket while `nowMs < retryAtMs`; eligibility does not read the
retry time. A Claim created after the failure means a retry is already running, so no requeue is
emitted. Exhausted Tickets are escalated instead of re-queued.

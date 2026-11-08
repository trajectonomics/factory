# Claim reconciliation

Implementation notes for [factory#5](https://github.com/trajectonomics/factory/issues/5).

`reconcileWork(state, nowMs)` returns three decisions. It reads no clock and writes nothing; the
Dispatcher applies them.

## Claim Lease

A Claim with a `claimedAtMs` and no live thread is stale once
`nowMs - claimedAtMs >= CLAIM_LEASE_MS` (two hours). The plan releases it. A label-only
`agent-working` Claim has no timestamp and is never released here, so adapters must supply
`claimedAtMs`.

## Attempts and exhaustion

`IssueState.runFailures` is the Run outcome history supplied by the adapter. A `failed` outcome
consumes an attempt; a `provider-rate-limit` outcome does not. A Ticket with two failed attempts is
escalated once: the plan names `ready-for-human`. Closed Tickets and Tickets already carrying that
label are not escalated.

## Rate-limit backoff

When the latest Run outcome is `provider-rate-limit`, the Ticket is re-queued and its Claim is
released with `retryAtMs = failedAtMs + PROVIDER_RATE_LIMIT_BACKOFF_MS`. A Claim created after that
failure means a retry is already running, so no requeue is emitted. Exhausted Tickets are escalated
instead of re-queued.

# ADR 0003: Guards Instead of Fixed Caps

## Status

Accepted

## Context

The owner chose to run with no fixed limits on concurrent Runs or daily drafts. Removing caps outright exposes four scarce resources: the human's review attention, the host's memory, disk and CPU, the model providers' rate limits, and the owner's GitHub account (secondary rate limits).

## Decision

The Dispatcher applies Guards that react to measured pressure rather than fixed numbers:

1. **Queue guard**: stop launching while the human's queue (open Factory pull requests, `needs-spec-review`, `ready-for-human`) exceeds a threshold.
2. **Host guard**: stop launching when load, memory or disk cross a threshold, and pace launches so a burst does not start together.
3. **Throttle-aware retry**: a provider rate-limit re-queues with backoff and does not consume a Ticket's attempts.
4. **Kill switch**: disabling the scheduled task, or a `factory:pause` label per repository, stops launching.
5. **Trusted-author intake**: only issues authored by org members or collaborators enter the Spec pipeline.

One Run per repository remains as mutual exclusion against merge conflicts, not as a throughput cap. Numeric thresholds are chosen in the first Tickets and tuned from the 3-day report.

## Consequences

- Throughput is bounded by what the human and the host can absorb, not by a number picked in advance.
- Every Guard needs a clear signal, so each is tested as a pure decision function.

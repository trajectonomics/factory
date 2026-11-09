# Dispatcher entrypoint

Implementation notes for [factory#10](https://github.com/trajectonomics/factory/issues/10). The rules come from
[ADR 0003](./adr/0003-guards-instead-of-fixed-caps.md) and [ADR 0004](./adr/0004-balance-runs-across-homeservers.md).

`runDispatchPass(adapters, config)` reads once, then either prints or applies: reconciliation of stale
Claims, handoffs and rate-limit requeues; the Guards; the existing pure eligibility core over the
reconciled state; per-repository exclusion, launch pace and host placement; then Claims and launches.
Reconciliation runs even when a Guard stops launches, and a Claim released in this pass can become a
Run in the same pass. In `dry-run` the pass calls neither `applyWrites` nor `launch`; it prints every
write, launch, skip and deferral.

The pace and thresholds are configuration, not constants: `policy.oneRunPerRepository` keeps ADR 0003's mutual
exclusion while the owner wants it, `policy.maxLaunchesPerPass` is the pace (omit it for none), and
`thresholds` holds the queue depth, launch interval and host thresholds. A zero or fractional pace is
rejected with `DispatchError` code `invalid-launch-pace`; reading one host twice is rejected with
`duplicate-host`. A host is a candidate only when it is `ready`, reachable, has the repository and
passes its health and pacing Guards; the pass picks the fewest live Runs and marks a host other than
the allowlist's as `fallback`. If a launch throws, the pass removes its Claims, records the error and
does not retry.
`passReport(plan, reading)` lists Runs, PRs, Gate failures, Exits by type, stale Claims and host load.
`threeDayReport(history, ledger, nowMs)` aggregates the reports from the last `THREE_DAY_REPORT_MS`.
`DispatchAdapters` keeps GitHub and T3 I/O out of the core.

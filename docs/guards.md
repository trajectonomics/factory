# Guards

Implementation notes for [factory#6](https://github.com/trajectonomics/factory/issues/6). The rules come from
[ADR 0003](./adr/0003-guards-instead-of-fixed-caps.md). Each Guard is a pure decision: measured pressure and
thresholds arrive as arguments, and a `GuardDecision` comes back. The Dispatcher composes them with eligibility.

## Units and comparisons

- The human's queue is `openPullRequests + needsSpecReview + readyForHuman`. The queue Guard stops only when the
  depth is **greater than** its threshold.
- Host health carries the load average and the memory and disk used fractions (`0..1`). The host Guard stops only
  when a measurement is **greater than** its threshold, and names every measurement that crossed it.
- Launch pacing carries the host's `lastLaunchAtMs`, `nowMs` and `minIntervalMs`. A launch waits until the interval
  has fully elapsed; the first launch on a host is always allowed.
- The kill switch checks the disabled schedule first, then the `factory:pause` label. The schedule stops every
  repository; a paused repository stops only its own launches.
- Trusted authors are owners, members and collaborators. Contributors, first-time contributors, first-timers,
  mannequins and unassociated authors never enter the Spec pipeline.

Thresholds and the pacing interval are inputs, not constants: the Dispatcher supplies the conservative values that
the 3-day report tunes.

# Guards

Implementation notes for [factory#6](https://github.com/trajectonomics/factory/issues/6). The rules come from
[ADR 0003](./adr/0003-guards-instead-of-fixed-caps.md). Each Guard is a pure decision: measured pressure and
thresholds arrive as arguments, and a `GuardDecision` comes back. The Dispatcher composes them with eligibility.

## Units and comparisons

- The human's queue is `openPullRequests + needsSpecReview + readyForHuman`. The queue Guard stops only when the
  depth is **greater than** its threshold.
- Host health carries the load average and the memory and disk used fractions (`0..1`). The host Guard stops only
  when a measurement is **greater than** its threshold, names every measurement that crossed it, and treats a
  non-finite measurement (`NaN` or `Infinity`) as pressure.
- Launch pacing carries the host's `lastLaunchAtMs`, `nowMs` and `minIntervalMs`. A launch waits until the interval
  has fully elapsed; the first launch on a host is always allowed. A clock that reports `nowMs` before
  `lastLaunchAtMs` still waits the full interval, never longer.
- The kill switch checks the disabled schedule first, then the `factory:pause` label. The disabled schedule is the
  only global stop; `factory:pause` pauses one repository at a time and only counts on an **open** issue.
- Trusted authors are owners, members and collaborators. Contributors, first-time contributors, first-timers,
  mannequins and unassociated authors never enter the Spec pipeline.

Thresholds and the pacing interval are inputs, not constants: the Dispatcher supplies the conservative values that
the 3-day report tunes.

## Dispatcher wiring

The Dispatcher (Ticket 10) sets `lastLaunchAtMs = nowMs` after every launch, so launches inside one pass cannot all
reuse the same stale timestamp and start as a burst.

## GitHub author associations

The adapter maps GitHub's `authorAssociation` values onto `AuthorAssociation`:

| GitHub | `AuthorAssociation` |
| --- | --- |
| `OWNER` | `owner` |
| `MEMBER` | `member` |
| `COLLABORATOR` | `collaborator` |
| `CONTRIBUTOR` | `contributor` |
| `FIRST_TIME_CONTRIBUTOR` | `first-time-contributor` |
| `FIRST_TIMER` | `first-timer` |
| `MANNEQUIN` | `mannequin` |
| `NONE` | `none` |

Any other value maps to `none`, so the intake Guard fails closed and keeps that issue out of the Spec pipeline.

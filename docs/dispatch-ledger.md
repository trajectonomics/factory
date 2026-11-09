# Dispatch ledger

Implementation notes for [factory#35](https://github.com/trajectonomics/factory/issues/35).

The pass report lists open Factory pull requests and Run Exits. `readDispatchLedger(client, t3, repositories, nowMs)`
reads them from GitHub and T3 so the caller no longer supplies a snapshot. `dispatchCommand` calls it when
`input.ledger` is absent; a caller that passes a ledger still wins. The decision logic is untouched.

| Ledger entry | Source |
| --- | --- |
| Pull request | open pull request whose head is `factory/<n>-<slug>` or `factory/spec-<n>-<slug>`; the issue is `<n>` |
| gate-failure Exit | a draft pull request from the list above, dated by when it was opened |
| spec-gap Exit | open `needs-info` issue with a Factory comment keyed `exit:spec-gap…` from an owner, member or collaborator, dated by the latest such comment |
| follow-up Exit | open `ready-for-human` issue whose body opens with `Follow-up from #<n>.`, which `followUpWrite` adds; the Exit belongs to issue `<n>` |
| urgent Exit | a `traj/<repo>#<n>` thread in the `waiting` status, dated by the pass that saw it (T3 reports no time) |

A pull request whose branch names no issue is left out. A `ready-for-human` issue without the origin line is
a human-queue item, not a follow-up Exit. The ledger reads `listIssues` a second time, so one pass costs one
more issue listing per repository.

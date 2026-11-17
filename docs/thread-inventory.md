# Thread inventory

Implementation notes for [factory#109](https://github.com/trajectonomics/factory/issues/109), the core
expression of [ADR 0004](./adr/0004-balance-runs-across-homeservers.md).

## The reading

`readThreadInventories(sources)` reads one `T3Client` per host, once, and returns one `HostThreads` per
host: `{ host, environmentId, ok, threads, error? }`. Each source lists that host's threads across all of
its projects, because the core has no projects of its own and a caller that listed one project would
under-count the host. A read that rejects is recorded as `ok: false` with its reason in `error`; it never
fails the pass. `dispatchCommand` reads the inventory once and both the repository state and the ledger
consume it, so a pass costs one listing per host.

## Everything a pass uses is derived from it

`liveThreadIssues` names the issues behind the live threads of every host that was read, once each in issue
order; `dispatchCommand` puts that set in `RepositoryState.liveThreads`, so eligibility, `busyRepositories`
and Claim reconciliation see both hosts without a second reading. `liveCountOf` counts one host's live
threads over the seven prefixes the runbook counts (`traj/`, `triage/`, `screen/`, `qa/`, `idea/`, `learn/`,
`assist/`), including a title that names no issue, and returns `undefined` for a host that was not read.
`HostSnapshot` carries no live count of its own, so the number placement is scored on cannot disagree with
the threads that produced it. `readThreads` is the threads of every host that was read, which the ledger
reads its urgent Exits from.

## A host that was not read is unknown, never idle

`unreadHosts` is every host the pass knows whose inventory entry is missing or not ok, or whose snapshot
says it is unreachable. `atRiskRepositories` is the repositories such a host carries: no host may take them
this pass, so the selection defers them with `host-unread` and `reconcileWork` makes no decision on their
issues, holding a Claim, requeue or hand-off that would otherwise be released as stale. An unread host is
also never a placement candidate, because its live count is unknown. `hosts` is the closed world: absence
means unread rather than empty. Readiness does not enter into it; a `pending` host that was read is known,
it is simply not a candidate.

## A duplicate host name fails the pass

`planDispatch` rejects a reading that names one host twice, in `hosts` or in `threads`, with `DispatchError`
code `duplicate-host` and the field of the list that repeated it.

## Two title parses

`runThreadIssue` parses only `traj/`, and stays the parser for urgent Exits and launch branches, so a
`waiting` draft thread is never counted as a Run Exit. `liveThreadIssue` parses any of the seven prefixes and
is the parser for the live set. An unsafe issue number fails the pass closed in either parse (`T3Error` code
`unsafe-issue-number`), rather than skipping a thread whose number cannot be trusted; a seven-prefix title
that does not carry `<repo>#<n>` names no issue and is counted only.

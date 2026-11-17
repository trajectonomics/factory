# T3 adapter

Implementation notes for [factory#8](https://github.com/trajectonomics/factory/issues/8).

## The seam

`T3Client` is injected into the adapter. `readThreadInventories` and `launchRun` are the only
operations that touch it, and tests drive them with recorded fixtures, so no test launches a real
thread. A dry run builds the launch request and returns it without calling `launchThread`.

`readThreadInventories` takes one `HostThreadSource` per host — the host name, its environment id and
its client — and reads each host once into a `HostThreads` entry, which is the per-host inventory of
[`thread-inventory.md`](./thread-inventory.md). A read that rejects becomes `ok: false` with its reason
and never fails the pass.

## Titles and branches

A Run thread is titled `traj/<repo>#<n>`, where `<repo>` is the full `owner/name`. An issue number
that is not a safe integer is rejected with `T3Error` code `unsafe-issue-number`. One live foreign
thread whose `traj/` title carries an unsafe issue number makes the title parse fail closed with that
code, rather than skipping the thread. `runThreadIssue` parses only `traj/`; `liveThreadIssue` parses
the same shape under any of the seven live prefixes, so a `triage/` or `screen/` thread names its issue
too, and under those six a number that cannot be trusted names no issue rather than failing the pass.

A Run branch is `factory/<issue>-<slug>`. The slug is lowercase ASCII, capped at 50 characters so
the branch stays inside git's limit. A title with no usable ASCII characters, such as Thai, CJK or
emoji, yields `factory/<issue>` rather than blocking the launch.

## Live threads

These thread statuses are live: `preparing`, `queued`, `starting`, `running`, `waiting`
(`isLiveThread`). A live thread is counted on its host when its title carries one of the seven
prefixes `traj/`, `triage/`, `screen/`, `qa/`, `idea/`, `learn/` or `assist/`
(`isLiveThreadTitle`), whether or not the title names an issue.

`idle` is deliberately not live. It has no active turn, so the Claim Lease (`CLAIM_LEASE_MS`, two
hours) holds the issue until the Dispatcher releases the Claim. Treating `idle` as live would keep
a dead Run's Claim forever.

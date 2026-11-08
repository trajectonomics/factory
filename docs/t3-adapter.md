# T3 adapter

Implementation notes for [factory#8](https://github.com/trajectonomics/factory/issues/8).

## The seam

`T3Client` is injected into the adapter. `listLiveThreads` and `launchRun` are the only
operations that touch it, and tests drive them with recorded fixtures, so no test launches a real
thread. A dry run builds the launch request and returns it without calling `launchThread`.

## Titles and branches

A Run thread is titled `traj/<repo>#<n>`, where `<repo>` is the full `owner/name`. An issue number
that is not a safe integer is rejected with `T3Error` code `unsafe-issue-number`.

A Run branch is `factory/<issue>-<slug>`. The slug is lowercase ASCII, capped at 50 characters so
the branch stays inside git's limit. A title with no usable ASCII characters, such as Thai, CJK or
emoji, yields `factory/<issue>` rather than blocking the launch.

## Live threads

These thread statuses are live: `preparing`, `queued`, `starting`, `running`, `waiting`.

`idle` is deliberately not live. It has no active turn, so the Claim Lease (`CLAIM_LEASE_MS`, two
hours) holds the issue until the Dispatcher releases the Claim. Treating `idle` as live would keep
a dead Run's Claim forever.

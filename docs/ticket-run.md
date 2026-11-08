# Ticket Run

Implementation notes for [factory#9](https://github.com/trajectonomics/factory/issues/9).

A Ticket Run starts when the Dispatcher launches a Run thread for an approved standalone Ticket. The
thread implements with `/implement`, runs the Gate and reports the result. The core turns that report
into writes; the GitHub adapter applies them. Nothing in the core reads a clock, launches a process
or calls GitHub.

## From Claim to pull request

`startTicketRun(ticket, claimedAtMs)` claims the Ticket with `agent-working` and moves its card to
**In progress**. The Run then works on `factory/<issue>-<slug>`, the branch from the T3 launch.

`planTicketRun(report)` is the decision at the end of the Run:

```text
gate report
  Gate ready
    -> ready pull request labelled factory
    -> file any Follow-up Tickets
    -> remove agent-working
    -> move the card to In review
  Gate needs another round
    -> no writes; run the next round
  Gate failed after two rounds
    -> draft pull request with the findings
    -> add ready-for-human
    -> remove agent-working
    -> move the card to In review
spec-gap report
  -> comment the question with the exit:spec-gap key
  -> add needs-info
  -> remove agent-working
urgent report
  -> no writes; the Run waits in its thread
  -> a notification names the Ticket and the reason
```

## Gate

A Gate round is `bun run check` plus the Conformance Review and the Standards Review. A round is
clean only when the check passes and both reviews have no findings. `evaluateGate` allows at most
`MAX_GATE_ROUNDS` (two) rounds; a third is rejected with `GateError` code `too-many-rounds`.

After a failed final round the findings come from that round, each prefixed with the review that
found it. A failed `bun run check` contributes `bun run check failed`. The draft pull request body
contains `Closes #<ticket>` and a **Gate findings** section with those lines.

## Pull requests and Follow-up Tickets

A ready pull request is never a draft and always carries the `factory` label. A failed Gate opens a
draft pull request with the same label and the findings. Both use `Closes #<ticket>` so the merge
closes the Ticket.

`gh pr list --head <branch> --state open` runs before creation, so re-planning a Run reuses the open
pull request on its branch instead of opening a second one.

A Follow-up Ticket is filed in the Run's repository with `ready-for-human` and the body the Run
reported. Filing it does not hold up the pull request: a ready Gate still opens one.

## Writes and dry runs

The plan holds `FactoryWrite` values, so `applyWrites` both validates the whole batch and prints every
intended write in dry-run mode. `pull-request` and `follow-up` are write kinds alongside claims,
labels, comments and Status. The `github` adapter performs them through `gh pr create` and
`gh issue create`.

## Urgent Exit

The urgent plan has no writes. It sets `waiting: true` and returns a `notification` string naming the
Ticket and the reason. The Dispatcher keeps the Run thread alive and delivers that notification; the
Claim stays with the waiting Run.

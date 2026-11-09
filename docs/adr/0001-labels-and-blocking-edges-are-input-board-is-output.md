# ADR 0001: Labels and Blocking Edges Are the Input, the Board Is Output

## Status

Accepted. The sentence that the Factory never sets `ready-for-agent` is amended by [ADR 0007](./0007-spec-drafter-can-approve.md): a Spec drafter may.

## Context

Work state is expressed twice today: issue labels (`needs-triage`, `ready-for-agent`, ...) and the org board's Status column. They disagree in practice. Cards sit in Ready while labelled `needs-triage` or `ready-for-human`, and `ready-for-agent` Tickets sit in Backlog.

## Decision

The Dispatcher reads only labels, native blocking edges, parent links and live threads. It writes the board Status column (In progress, In review, Done) and never reads it. Approval is the human relabelling an issue `ready-for-agent`; the Factory never sets that label.

## Consequences

- One source of truth, and it is the one a human edits when triaging.
- The board becomes a display. A hand-moved card changes nothing.
- Cross-repository blocking works for free, because blocked-by edges span repositories.

# ADR 0002: A Spec Run Builds Blocked Tickets, a Ticket Run Builds the Rest

## Status

Accepted

## Context

The human merges every pull request. A Ticket unblocks its dependents only when it is closed, which means merged. A chain such as A blocks B blocks C would advance one Ticket per human merge cycle if each were its own pull request.

## Decision

Labelling a parent Spec `ready-for-agent` is the Approval for a **Spec Run**: all open child Tickets are built on one integration branch with `/implement-spec`, reviewed once, and delivered as one pull request. A Ticket labelled `ready-for-agent` with no approved parent is a standalone **Ticket Run** with its own pull request.

## Considered Options

- Ticket pull requests only: small and easy to review, but chains stall on the human.
- Stacked pull requests: parallel, but squash merges force a rebase of every layer and add failure modes.
- Spec pull request only: one merge per Spec, but a single large review even for independent Tickets.

## Consequences

- The Spec issue is the unit the human thinks in and approves.
- A Spec Run produces a larger pull request; the commits stay one per Ticket so it remains reviewable.

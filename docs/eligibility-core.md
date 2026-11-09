# Eligibility core

Implementation notes for [factory#4](https://github.com/trajectonomics/factory/issues/4).

## A host or cloud change is `ready-for-human`

The Factory never changes a host or a cloud platform. A Ticket that needs one is human-only work,
so it is marked with the existing `ready-for-human` triage label (see
[`docs/agents/triage-labels.md`](./agents/triage-labels.md)). The eligibility core never plans it,
including as a Spec Run child. It never infers this from an issue body: labels, blocking edges,
parent links and live threads are the only inputs (ADR 0001).

## Claims

A label-only `agent-working` (no `claimedAtMs`) never expires in the core, so the adapter must
always supply `claimedAtMs`.

## Runs per repository are the Dispatcher's concern

The eligibility core decides per issue. It does not restrict Runs per repository (ADR 0006
removed the one-Run-per-repository rule of ADR 0003); the Dispatcher composes eligibility with the
Guards and host placement.

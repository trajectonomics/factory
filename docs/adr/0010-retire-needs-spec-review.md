# ADR 0010: Retire `needs-spec-review`; a Drafter Approves or Asks in Its Thread

## Status

Accepted. The owner asked for it on 2026-11-09. It supersedes the `needs-spec-review` parts of [ADR 0006](./0006-runs-are-not-exclusive-per-repository.md) and [ADR 0007](./0007-spec-drafter-can-approve.md).

## Context

`needs-spec-review` was the state between a drafted Spec and its Approval: the drafter posted the draft, labelled the issue, and the owner reviewed. Since a drafter now consults two models, asks the owner its real questions in its thread (ADR 0009) and can approve (ADR 0007), the state only parks a draft that has nothing left for the owner to decide, or duplicates a question already asked in the thread. Both cost the owner a trip to the issue.

## Decision

1. No new issue gets `needs-spec-review`.
2. A drafter with no problem moves the issue straight to `ready-for-agent`.
3. A drafter with an important question asks it in its thread and leaves the issue in the state it has (usually `needs-triage` or no state label). It posts no draft comment and adds no label while it waits. The owner answers in the thread, and the drafter then continues to Approval.
4. A condition that blocks Approval (a quota fallback review, a blocked issue, an untrusted author) is an Owner question in the thread, not a label.
5. Issues that already carry `needs-spec-review` keep it until a refresh approves them or the owner relabels them; the Dispatcher's refresh rule still reads it, and the draft queue guard counts it.
6. The draft queue guard (10) counts issues waiting for an owner answer: draft threads whose last message ends in an `ASKING` line, plus issues still carrying the retired label.

## Considered Options

- Keep `needs-spec-review` as a parking state for a drafted Spec the owner may want to read: the owner already reads what matters in the thread, and the label adds a click and a stale state.
- Delete the label from the repositories: loses the signal on the seven drafts already parked there.

## Consequences

- The issue shows only `needs-triage` (waiting, or being drafted) or `ready-for-agent`. Where the question is pending is visible in the thread list, not on the board, so the Dispatcher's report lists waiting draft threads.
- The entrypoint's queue depth field `needsSpecReview` (`docs/guards.md`) now counts waiting issues. Renaming it is left to the next change to that code.
- A draft the owner would have wanted to read before Approval is approved without a read. The owner can remove `ready-for-agent` before the next pass launches a Run.

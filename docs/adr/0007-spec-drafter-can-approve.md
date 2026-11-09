# ADR 0007: A Finished Spec Draft Can Approve Its Own Issue, on a Stronger Model

## Status

Accepted. The owner asked for it on 2026-11-09. It supersedes decision 4 of [ADR 0006](./0006-runs-are-not-exclusive-per-repository.md) and its rejected option "Let drafts count toward approval", and amends [ADR 0001](./0001-labels-and-blocking-edges-are-input-board-is-output.md) and [ADR 0005](./0005-run-merges-its-own-pull-request.md) where they say the Factory never sets `ready-for-agent`.

## Context

A Spec draft thread already critiques its draft with two independent reviewers and, when a decision is the owner's, grills the owner in its own thread until the owner has answered. When nothing is left to decide, the only remaining step was the owner clicking `ready-for-agent`, which stalls the pipeline on a label click with no information in it. The drafter also ran on the same cheap model as a Run, although a Spec decides what gets built.

## Decision

1. A Spec drafter adds `ready-for-agent` itself, and removes `needs-spec-review` and `needs-triage`, when all of these hold: the Open Decisions list is empty; every question it asked the owner in its thread is answered and confirmed (or it had none); the critique ended with no disagreement; no review is marked `FALLBACK (quota)`; the issue carries none of `needs-info`, `ready-for-human`, `wontfix`; the issue author is `OWNER`, `MEMBER` or `COLLABORATOR`. Otherwise it adds `needs-spec-review` and the owner decides, as before.
2. Only the drafter thread approves. The Dispatcher and Runs never add `ready-for-agent`, and nobody but the owner adds `wontfix`.
3. The next pass treats the label like any Approval: the issue becomes Eligible and, with no sub-issues, gets a Ticket Run that follows the draft's Ticket order.
4. Spec drafter threads run on `claudeAgent` `claude-sonnet-5-5` with `effort: high`. Implementer Runs stay on `pi` DeepSeek.

## Considered Options

- Keep Approval with the owner alone (ADR 0006): safest, but every drafted issue waits for a label click even when the draft raised nothing for the owner.
- The drafter approves only after an explicit yes from the owner in its thread: keeps a human act on every Approval, but adds a round trip when the drafter had nothing to ask.

## Consequences

- Approval no longer always comes from a human act. The guard is the draft's conditions above, not the author's opinion; the owner can still remove the label before the next pass.
- The Merge gate is unchanged, so an auto-approved Run still passes two independent reviews, checks and the limits before it merges.
- The drafter and the `claudeAgent` critic now run the same model, so that critic is less independent than before. The `antigravity` critic is unchanged. Revisit if this shows up in the reports.
- `needs-spec-review` now means the owner has something to decide. Its queue guard stays at 10.
- The scheduled Dispatcher prompt still says it never adds `ready-for-agent`. That stays true: the drafter thread adds it, not the Dispatcher.

# ADR 0025: An Improvement Pass Lands the Owner's Words in the Session Itself

## Status

Accepted. The owner asked for it on 2026-11-18 in a T3 Code session: "I want to improve you at the end of this session I want new skills call factory improvement too". It adds an owner-driven path beside the nightly Learning job of [ADR 0013](./0013-learning-prs-merge-themselves.md).

## Context

Learning reads the day's `traj/`, `triage/`, `screen/`, `qa/`, `idea/`, `learn/` and `assist/` threads and opens one pull request when they show friction. It runs at night, it cannot ask the owner anything, and it never sees the ordinary session where the owner says "next time summarize the question in chat". That sentence is a rule with its evidence attached: the owner said it, and only the repository can carry it to the next thread (AGENTS.md rule 8). Waiting for the next Learning delays the change by a day and loses the session's context.

## Decision

1. `factory-improvement` is a model-invoked skill that runs one improvement pass in the session where the owner said how the Factory should work. [`docs/improvement-runbook.md`](../improvement-runbook.md) owns the procedure; the skill only points at it.
2. The pass quotes the owner's words, finds the rule that produced the behaviour, and changes one authoritative file per cause: `docs/owner-preferences.md` for how the owner is called; a runbook for thread behaviour; `GLOSSARY.md` for a term; an ADR for a hard-to-reverse decision; a test or script for a mechanical rule.
3. It asks the owner only what the words leave open, in the chat, and never sends them to an issue to answer.
4. It opens a ready pull request on `feat/` or `docs/` with the owner's words as the evidence, and merges it under [Merging](../dispatcher-runbook.md#merging) — `Mode` live, no `.factory-no-automerge` — when `bun run check` passes and both independent reviews are clean, unless the change goes beyond what the owner said.
5. A change the owner asked for may touch an ADR or a factory-owned skill and its symlinks, because the owner is present and their words are the decision. A change the pass inferred on its own may only touch what the Learning merge gate lets an agent change. A change to the Allowlist, Hosts, Merging text, a Guard number or the Learning merge gate stays open for the owner even when they asked.

## Considered Options

- **Wait for the nightly Learning**: no new mechanism, but a day of delay, and Learning does not read the session the owner is talking in.
- **Let the owner edit the docs by hand**: fastest, but nothing verifies the change and the next thread may contradict it.
- **An improvement pass in the session, with the owner's words as the approval**: the change lands while the context is live.

## Consequences

- The owner can change how the Factory works without opening an issue or writing a rule by hand.
- Two rule-changing paths now exist. An improvement pass and a Learning may touch the same rule; whichever lands second rebases, and the later evidence wins.
- An improvement pull request merges with the owner in the session. The Learning gate is unchanged: it still protects those paths from a pass the owner is not watching.

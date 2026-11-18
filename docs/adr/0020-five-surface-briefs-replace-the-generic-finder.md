# ADR 0020: Five Surface briefs replace the generic finder for those repositories

## Status

Accepted. The owner asked for it on 2026-11-15: "let split it into multiple next step skills… each project/page/web have its own use case". It replaces the single brief of [the Next-step finder](../next-steps-runbook.md) for five repositories and leaves it for the rest. Decision 3 is amended by [ADR 0022](./0022-a-surface-leaves-the-rotation-when-its-task-exists.md): a Surface leaves the rotation when its task exists, not when this decision is written. Decision 5's `/go/*` counter is retired: [`site` ADR 0011](https://github.com/trajectonomics/site/blob/main/docs/adr/0011-analytics-from-the-page-itself.md) and [`docs` ADR 0008](https://github.com/trajectonomics/docs/blob/main/docs/adr/0008-analytics-from-the-page-itself.md) measure from the page itself into PostHog project `268299`, and `web-router` never served such a count.

## Context

The Next-step finder has one brief for twenty repositories: "what would make this repository more useful to people who need to make financial decisions". The rotation visits every repository every fourth day, and every repository is weighted alike, so `infra` and `cicd` get the same attention as the Surface where G1 lives. Two of the five product Surfaces had already shipped, published, and were being read by strangers, and no pass knew what a reader of them was trying to do.

The cost of that blindness was measurable on 2026-11-15. The landing page promised "plan your retirement" and "project your finances"; `docs` was accurately synced to `v0.1.0` and therefore documented neither; `projection`, `fi` and `scenario tax` existed only on `main`. One root cause — the only release was `v0.1.0` and every other Surface described `main` — sat across three repositories, and each thread could see only its own. A generic brief cannot see a promise in `site` that a page in `docs` fails to keep.

## Decision

1. **Five Surfaces**, each a published thing a customer meets: `docs`, `site`, `cli`, `skills`, `core` (the four pure packages together: `money`, `ledger-core`, `tax-core`, `sim-core`).
2. **Each Surface has its own Next-step brief**, in `docs/next-steps-runbook.md`, naming its reader, its one target, the test that measures the target, and the release-truth rule: the published `latest` and the live URL are the truth, `main` is not.
3. **These five leave the rotation.** The generic finder keeps the other allowlisted repositories and its fourth-day rotation.
4. **Testing is a separate pass** with its own skill, [`docs/qa-runbook.md`](../qa-runbook.md), because exploring what to build next and verifying what shipped pull in opposite directions. Findings enter dispatch by [ADR 0021](./0021-qa-findings-enter-dispatch-at-their-severity.md).
5. **`web-router` is not a Surface.** Two things the Surfaces need — the sitemap and the `/docs` mount — live there, so every Surface brief carries one short deployment line naming what `web-router` must do. It earns a Surface the day it has its own reader.
6. **The rules stay in this repository**, one runbook for all five briefs, so the caps and the release-truth rule cannot drift between copies.

## Considered Options

- **One brief with a per-repository profile argument.** Rejected: the profile still has one author and one reading, and the discovery on 2026-11-15 needs each brief to state its own reader and test.
- **Keep the rotation and add the five as extra work.** Rejected by the owner (2026-11-15): "let run these 5 every day and rotate only the all other".
- **Make `web-router` a sixth Surface.** Rejected for now: it has no reader of its own; its work belongs to the Surface that needs it.
- **Put each brief in its own repository's `AGENTS.md`.** Rejected: rules belong in `factory`, and a Surface repository cannot change a rule the Factory follows.

## Consequences

- Five scheduled tasks run daily instead of one rotation pass; the cost is DeepSeek quota, and a Surface whose day has no quota is skipped with `no-quota` in the report, never moved to another model.
- A Surface brief can be wrong about its reader; the two-week revisit in the QA runbook and the owner's reading of the reports are the correction.
- The `skills` Surface is a customer's agent, not a customer, and `docs` serves both a person and an agent; the briefs say so rather than averaging the two.

# ADR 0009: Spec Drafters Ask Little, Consult First, and Finish Without the Owner

## Status

Accepted. The owner asked for it on 2026-11-09 after watching the first draft threads. It amends the Spec draft brief of [ADR 0006](./0006-runs-are-not-exclusive-per-repository.md) and builds on [ADR 0007](./0007-spec-drafter-can-approve.md) and [ADR 0008](./0008-every-thread-gets-its-own-worktree.md).

## Context

In the first draft threads the owner answered "yes to all" to most rounds, asked what a question was about before answering it ("what does memo do", "what exactly are we doing here"), asked for a second opinion before deciding ("ask Sonnet 5.5 high", "ask Argon 4 medium, I have no opinion, save my energy"), and then typed the next step by hand each time (`$to-tickets`, "what next"). Threads also left local changes unmerged, and one draft proposed work the owner had already done in `cicd`. The owner's time is the scarce resource the Factory exists to protect.

## Decision

1. **Consult before asking.** The drafter takes every Open Decision to Sonnet 5.5 high and Argon 4 medium first. It decides alone when both agree with it or the decision is reversible and local. Decisions are recorded as Decided (consulted).
2. **Ask only what matters.** An Owner question is asked when the decision changes how the org works or is hard to undo, and the consultants disagree with the drafter or each other. At most 3 per round, the most consequential first.
3. **Questions stand alone.** Each carries context in plain words, why it matters, the risk, both consultants' views and a recommendation, because the owner returns without the context.
4. **Check staleness first.** The drafter looks for the work already done elsewhere in the org, `cicd` first, and says so with evidence instead of drafting it.
5. **Finish alone.** After Approval the drafter publishes the draft's Tickets as sub-issues with native blocking edges (the `to-tickets` skill, without its quiz), applies the Docs to update in a docs pull request and merges it when the decisions it records are settled and checks pass, and ends with a clean worktree.
6. **Infra is the owner's.** Work that needs a host, a cloud platform, a registry or trust setting, or a credential becomes a `ready-for-human` issue in `trajectonomics/infra` with everything needed, and the thread carries on.

## Considered Options

- Keep asking every Open Decision with a recommendation: the owner confirms with "yes to all", at the cost of a round trip and attention each time.
- Never ask: fastest, but an org-wide or irreversible choice would be taken by a model alone.

## Consequences

- Fewer owner messages; the risk moves to the consultants. Two models agreeing is not proof, which is why irreversible and org-wide decisions still reach the owner when they disagree or are unsure.
- A drafter may merge a docs pull request that touches an ADR, GLOSSARY or AGENTS.md. This is narrower than the Merge gate (ADR 0005), which keeps those files with the owner for Runs: it applies only to a draft thread's own docs pull request, only for decisions the owner answered or the consultants unanimously backed, and never to workflows or lint, type or release configuration.
- Sub-issues are created before any Run starts, so the next pass sees a Spec with children and launches one Spec Run (ADR 0002). A Spec with a single Ticket still runs as a Ticket Run.
- The consultant model name `gemini-4-argon` is in the Models table; if the provider renames it, the brief and the table change together.

# ADR 0028: Reviews Run on Hydrogen and Grok After Mistral Is Retired

## Status

Accepted. The owner asked for it on 2026-11-21 in a T3 Code session: "let remove mistral from all of our machine and also in the repo note and this repo run book but do not remove .vibe skills in case we use it in future". It supersedes decision 2 of [ADR 0018](./0018-deepseek-top-level-hydrogen-mistral-reviews.md), and the reviewer and consultant models in decision 2 of [ADR 0005](./0005-run-merges-its-own-pull-request.md), decision 3 of [ADR 0012](./0012-ideas-are-screened-and-labels-follow-the-owners-word.md), decision 2 of [ADR 0013](./0013-learning-prs-merge-themselves.md), and the Consequences of [ADR 0009](./0009-drafters-ask-little-and-finish-alone.md) and [ADR 0022](./0022-a-surface-leaves-the-rotation-when-its-task-exists.md). Those files keep their decision text as written; each carries the supersession in its Status line or here.

## Context

ADR 0018 put every review and consult on `antigravity` / `gemini-4-hydrogen` and `mistral-vibe` / `mistral-large-4`, in combination. The owner is removing Mistral Vibe from every machine, so `mistral-vibe` is no longer a provider a `delegate_task` can reach: the Conformance Review lane and every consultant that named it would fail on the next pass.

The reviews have to stay two independent lanes: the model that wrote the code never marks its own work. Authors are always `pi` / DeepSeek, so both lanes must sit on another provider.

## Decision

1. Reviews and consults run on `antigravity` / `gemini-4-hydrogen` and `cursor` / `grok-4.7`, in combination in the same round. This keeps the preference order of ADR 0018 with Mistral removed: `gemini-4-hydrogen` > `grok-4.7`.
2. The **Conformance Review** lane moves to `cursor` / `grok-4.7` (`reasoning_effort: high`, `contextWindow: 500k`, `fastMode: false`); the **Standards Review** lane stays on `antigravity` / `gemini-4-hydrogen` (`thinking_level: medium`). `cursor` must report `canRunChildTask: true` on the host, or the review does not run.
3. Each lane's quota fallback is the other lane when that model is independent in that round, then `pi` / DeepSeek labelled `FALLBACK (quota)` for a Run's editions, and nothing for a Learning, which never falls back (ADR 0013).
4. `mistral-vibe` and `mistral-large-4` are retired like `claude-sonnet-5-5` and `gemini-4-argon`: no `delegate_task` target, Models-table review row, fixture or Gate evidence routes work to them again. A runbook line may still mention either only to say it is retired (`retire`, `no longer`, `removed` or `gone`) and may carry no `providerInstanceId`. `src/runbook-models.test.ts` enforces exactly that, plus the two lanes of decision 2.
5. The `.vibe/skills` symlink farm stays in every repository and stays in `src/skill-links.test.ts`, so a future Mistral Vibe adoption needs no re-linking.

## Considered Options

- **Keep Mistral as a review lane on one machine**: contradicts the owner's removal, and a lane that exists on one host makes the pass placement depend on which host launched it.
- **Move both review lanes to `cursor`**: one provider for both reviews loses the independence the gate exists for, and one cursor quota failure stops every review.
- **Promote `claudeAgent` / Opus 5.5**: its weekly limit is the quota ADR 0018 already ran out of.

## Consequences

- Conformance and Standards stay independent and on separate providers, so one provider's quota failure still leaves one lane running.
- **There were three review providers before and there are two now.** ADR 0018's spare was `cursor`; promoting it means that when `cursor` is out, the sibling `antigravity` is already the Standards reviewer in that round, so no independent fallback exists: a Run records its Conformance Review on `pi` as `FALLBACK (quota)`, and a Learning night launches nothing ([ADR 0013](./0013-learning-prs-merge-themselves.md)). The owner's removal leaves no third lane, so this is accepted, not solved.
- Standards Review is now the stronger lane, and Conformance — the Spec audit — the weaker one. ADR 0018's order leaves no better independent option once Mistral is gone.
- `cursor` is promoted from quota fallback to a primary reviewer, so its `canRunChildTask` capability and its quota are now on the critical path of every Run, not just of a fallback.
- A host whose `cursor` cannot run child tasks cannot run a Conformance Review, which blocks the merge gate rather than silently reviewing with the author's model.

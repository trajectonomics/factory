# ADR 0018: DeepSeek on Top-level Threads, Hydrogen and Mistral on Reviews

## Status

Accepted. The owner asked for it on 2026-11-15. It supersedes the model routing of decision 2 of [ADR 0005](./0005-run-merges-its-own-pull-request.md), decision 4 of [ADR 0007](./0007-spec-drafter-can-approve.md), decision 3 of [ADR 0012](./0012-ideas-are-screened-and-labels-follow-the-owners-word.md), decision 2 of [ADR 0013](./0013-learning-prs-merge-themselves.md), and the 2026-11-14 model-tier split in the Models section of `docs/dispatcher-runbook.md`.

## Context

`claude-sonnet-5-5` and `gemini-4-argon` are running out of quota: on 2026-11-15 the hourly Dispatcher pass died on `claudeAgent`'s weekly limit before any guard had run, and the owner had to take the thread over by hand. The 2026-11-14 split put every top-level thread on a Worker-tier model, alternated Spec Runs between DeepSeek and `mistral-large-4` by issue-number parity, ran drafters on Sonnet, and reserved Argon and Sonnet for reviews.

## Decision

1. Every top-level thread (`traj/*`, `triage/*`, `screen/*`, `assist/*`, `learn/*`, `idea/*`) runs `pi` / `command-code/deepseek/deepseek-v4.1-flash` only. There is no quota fallback for a top-level thread: when `pi` has no quota, the role is skipped with `no-quota`.
2. Reviews and consults (every `delegate_task` reviewer or consultant) run on `antigravity` / `gemini-4-hydrogen` and `mistral-vibe` / `mistral-large-4`, in combination in the same round. `cursor` / `grok-4.7` is the quota fallback when `canRunChildTask` is true on the host; `pi` / DeepSeek is the last resort and is labelled `FALLBACK (quota)`, because it is never independent of a DeepSeek thread.
3. `claude-sonnet-5-5` and `gemini-4-argon` are not used anywhere. `gemini-3.8-flash` stays retired.

## Considered Options

- Keep Sonnet and Argon for reviews and move only top-level threads to DeepSeek: preserves the strongest reviewers, but their quota is the thing that is exhausted.
- Move reviews to DeepSeek as well: cheapest, but the model that wrote the code would mark its own work, which the v0 Spec (story 8) forbids.

## Consequences

- The Spec drafter no longer runs a stronger model than a Run (the reason given in ADR 0007 decision 4); the Approval conditions of ADR 0007 decision 1 remain the guard, and the drafter's consultants are now Hydrogen and Mistral instead of Sonnet and Argon.
- Reviews stay independent of the author: the author is always DeepSeek, the reviewers are Hydrogen and Mistral.
- `mistral-large-4` moves from top-level threads to reviews; its quota is probed in step 1 of the dispatcher runbook like any other reviewer provider.
- If `pi` quota runs out, top-level work pauses (`no-quota`) instead of degrading to another model; the pass report names the reset time.

# ADR 0022: A Surface leaves the rotation when its task exists

## Status

Accepted. The owner asked on 2026-11-16 to drive [ADR 0020](./0020-five-surface-briefs-replace-the-generic-finder.md) into existence, and to schedule the tasks later: "let drive this into existence … and let not make it schedule for now". It amends decision 3 of ADR 0020 and leaves decisions 1, 2, 4, 5 and 6 as they are.

## Context

ADR 0020 decision 3 takes five Surfaces out of the fourth-day rotation and gives each a daily pass. That assumed the five daily tasks exist. They did not when the QA machinery merged (factory#106): the owner registers a scheduled task by hand, and on 2026-11-16 none of the five existed.

Taken literally, decision 3 then removes the only pass that visits `docs`, `site`, `cli`, `skills`, `money`, `ledger-core`, `tax-core` and `sim-core` — the eight repositories G1 depends on, with a checkpoint on 23 November — and replaces it with nothing until someone remembers to schedule. That is the blindness ADR 0020 was written to end, reintroduced by its own remedy. A rule that depends on an action taken outside this repository cannot assume the action happened.

## Decision

1. The five Surface briefs live in [`docs/next-steps-runbook.md`](../next-steps-runbook.md#the-five-surface-briefs) from this pull request, whether or not a task runs them.
2. A Surface leaves the rotation only when its `Task` cell in the Surface table names a time. Until then its repositories stay in the rotation and the generic Brief keeps them.
3. The owner flips that cell in the same pull request that registers the task, so the runbook and the schedules cannot disagree for longer than that one pull request.
4. The QA pass is not a Surface task. One scheduled QA task tests one Surface a day, the Surface at index `d mod 5` in the order `docs`, `site`, `cli`, `skills`, `core`, with `d` the days since 2026-01-01 in Asia/Bangkok as the finder's rotation counts it.

## Considered Options

- **Take the eight repositories out now and schedule next.** Rejected: it trades a pass that runs for a pass that is promised, and the one that stops running is the one the 23 November checkpoint needs.
- **One task that loops all five Surfaces.** Rejected: five threads in one run has no per-Surface retry, no per-Surface `no-quota`, and one failure loses four Surfaces.
- **Keep all eight in the rotation and never write the briefs.** Rejected: it leaves decision 2 of ADR 0020 unimplemented, and eight repositories on one generic brief every fourth day is the state ADR 0020 rejected.
- **Five QA tasks, one per Surface.** Rejected: five top-level DeepSeek threads and up to fifteen persona children a day to test something the launch check already covers before a release, when one Surface a day reaches all five every fifth day.

## Consequences

- A Surface with `not registered` is covered by the rotation's generic pass and by the launch check, and by no Surface pass of its own, until the owner registers the task. The table is the only place that says which, and the finder's report names the gap every pass, so it is visible in one line rather than in a schedule nobody opens.
- Registering all five at once adds five DeepSeek threads and ten reviewer calls a day to a day that already runs the rotation, Learning, the Dispatcher and the QA pass. Those reviewer calls are `gemini-4-hydrogen` and `mistral-large-4`, the two models ADR 0018 moved reviews onto after Sonnet and Argon ran out; their only other lane is `cursor` / `grok-4.7` as a quota fallback. The table lets the owner start with one Surface: `cli` and `skills` are the two the 23 November checkpoint needs.
- `core` has no single repository. Its pass runs in the `factory` project and files each Idea in the repository that owns it, which is the only shape that does not invent a `trajectonomics/core` remote.

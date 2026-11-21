# ADR 0027: The Idea Lane Is Frozen

## Status

Accepted. The owner asked for it on 2026-11-21 in a T3 Code session: "let remove the next step skills first and stop the that routine I want to freeze the issue for now". It suspends [The finder](../next-steps-runbook.md#the-finder) and [Screening](../next-steps-runbook.md#screening) of [ADR 0012](./0012-ideas-are-screened-and-labels-follow-the-owners-word.md) and the Surface passes of [ADR 0022](./0022-a-surface-leaves-the-rotation-when-its-task-exists.md). It changes no label, no Owner word and no rule about what an Idea is.

## Context

The Idea lane is the one lane that files work nobody asked for: the Next-step finder explores a quarter of the repositories a day, two models review what it found, and it files up to two Ideas per repository; Screening then decides whether each one goes to a Spec drafter or to the owner. It has been the org's most productive source of issues and the owner's largest reading queue: on 2026-11-21 28 Ideas were open, 15 of them `idea-for-human`, and the finder was filing more every day at 12:00 Asia/Bangkok, with `cli` and `skills` filing again at 15:00 and 16:00.

The same week the owner opened [factory#124](https://github.com/trajectonomics/factory/issues/124), a two-department pivot in which requirements arrive from the back-office bot instead of being invented by the Factory. While that Spec is unsettled, every Idea the finder files is a suggestion against a scope that is about to change, and every screening thread spends quota deciding whether to keep it.

The owner's instruction is to remove the skill first and stop the routine. That is the whole remedy: the lane stops, the open Ideas stay where they are, and nothing is declined or postponed on the way out.

## Decision

1. **The lane is frozen, not deleted.** `docs/next-steps-runbook.md` keeps [The finder](../next-steps-runbook.md#the-finder), [Screening](../next-steps-runbook.md#screening), the Surface briefs and the Idea issue format; each of the two sections opens with a `**Frozen.**` line naming this ADR. A rule that survives the freeze is restored by re-enabling a task, not by rewriting it.
2. **The skill is removed.** `.agents/skills/factory-next-steps` is deleted, with its `.claude/skills` and `.vibe/skills` symlinks, so no agent can run a finder pass by name. `.agents/skills/factory-qa`, `factory-learning`, `factory-dispatcher` and `factory-launch-check` stay: they read the Surface table and the Idea lifecycle, and none of them files an Idea.
3. **Three tasks stop.** "Factory Next Steps" (12:00), "Factory Surface: cli" (15:00) and "Factory Surface: skills" (16:00) are disabled, not deleted: the owner can re-enable any of them, and their history stays. The Surface table in the runbook reads `not registered` for all five, because [ADR 0022](./0022-a-surface-leaves-the-rotation-when-its-task-exists.md) decision 2 ties a cell to a task that exists and decision 3 ties a re-registration to the pull request that registers the task.
4. **No favour to the queue.** The freeze files nothing, screens nothing, declines nothing and postpones nothing. The open Ideas keep their labels and wait for the owner's words, which the Dispatcher applies when it reads this repository's rules again. Leaving them is deliberate: the owner is deciding a scope, and a decision made for them now would be a decision they have to undo later.
5. **The Goal and the Roadmap lose their only readers, and that is allowed.** Goal and Roadmap agreement is how the finder and Screening judge a candidate; a frozen lane judges nothing, so the reading rule stays in [ADR 0016](./0016-roadmap-is-read-from-the-org-project.md) and goes unexercised. Regenerating Ideas is the moment the freeze ends, not a job to be handed to the back-office.
6. **Unfreezing is one pull request.** It re-enables the task, restores the skill or leaves it removed deliberately, and writes the `Task` cell back in the same pull request. Until then a pass that finds an open Idea applies the owner's words (the Dispatcher's step 11a) and launches no screening thread (step 11b).

## Considered Options

- **Keep the skill and rely on the disabled task.** Rejected by the owner's first word: "let remove the next step skills first". A skill whose task is off is a loaded gun in every thread's skill list, and the next assistant would offer to run it.
- **Decline the 15 `idea-for-human` Ideas as part of the freeze.** Rejected: it destroys the owner's queue at the moment the queue is the input to their scope decision, and `wontfix` would stop the finder from ever proposing the same thing again if the lane is restored.
- **Delete the runbook sections and the Idea labels too.** Rejected: the owner said "freeze the issue for now", and fifteen of the open Ideas are waiting on a scope that is about to be decided. The label vocabulary, the Owner words and the Idea format are what a freeze has to keep.
- **Freeze everything, including the Dispatcher.** Rejected: `factory#124` step 1 already says "freeze new Runs and drafts on the archive candidates", which is a different, narrower stop. The Dispatcher, Learning and QA read the same repository and keep running.

## Consequences

- The daily 12:00, 15:00 and 16:00 DeepSeek threads stop, with their reviewer calls. The day keeps the Dispatcher every 6 hours, Learning at 00:00, QA at 18:00 and the launch check by hand.
- Nothing refreshes Ideas, so the 28 open Ideas age: they keep waiting for Screening that no longer runs, and the count against 12 and 24 stops moving. The Dispatcher's report still names the count, so the owner sees the queue in one line.
- A restore is cheap because the freeze kept the rules: re-enable the three tasks and write the two cells back. What the owner decides in `factory#124` about the intake contract may make the finder's brief wrong rather than late, and that is a rewrite in the same pull request as the restore.
- This ADR is the record a later pass reads before it proposes to "fix" the quiet: a frozen lane is a decision, not a failure, and a report that says "no Ideas filed today" is the intended state.

# Learning runbook

How the nightly Learning job works. The scheduled task "Factory Learning" fires at 00:00 Asia/Bangkok and reads this file from `origin/main` on every run, so a change here takes effect on the next run once it is merged. The job looks at the threads the Factory ran since its last Learning and, when they show friction, opens one pull request that changes how the Factory works so the friction does not recur. Language is in [`GLOSSARY.md`](../GLOSSARY.md); the decision is [ADR 0013](./adr/0013-learning-prs-merge-themselves.md).

The scheduled thread is a launcher, like the Dispatcher: it checks the guards, places one Learning thread, reports, and stops. The Learning thread does the work.

## One run

1. **Guards.** Launch nothing and report if either holds: the kill switch file `/home/prame_assistant/.factory-stop` exists; or no host is a candidate (the Readiness table and host rules of the dispatcher runbook, step 7). The Queue guard does not apply.
2. **An earlier Learning is still open.** If a pull request with a head branch starting `learn/` is open, open no second one. Check the [Learning merge gate](#learning-merge-gate) against its current head and merge it if it holds; otherwise name the first failed condition in the report. Stop.
3. **Window.** The window starts at the `covered-until` timestamp in the body of the latest merged `learn/` pull request (`gh pr list -R trajectonomics/factory --state merged --search "head:learn/" --limit 1 --json body`), and at most 3 days before now; with no earlier pull request it starts 3 days back. A run with no friction opens no pull request, so the next run's window simply reaches further back.
4. **Launch the Learning thread** with `t3_thread_launch` on the host chosen as in the dispatcher runbook, step 7, in the `factory` project:
   - `title`: `learn/trajectonomics/factory`; `clientRequestId`: `learn-<yyyymmdd>` (the date in Asia/Bangkok);
   - `runtimeMode`: `full-access`;
   - `modelSelection`: provider `pi`, instance `pi`, model `command-code/deepseek/deepseek-v4.1-flash`;
   - `workspaceStrategy`: `worktree` from `origin/main` on branch `learn/<yyyymmdd>`.
   - The message is the Launch message below, with the window start filled in.
5. **Report** in under 8 lines: guards, the window, the host, the thread link, any earlier Learning pull request and its first failed condition. Do not wait for the thread to finish.

## Launch message and brief

Launch message (fill in and send):

> You are the Factory Learning thread for the window starting `<window start>`. Run `git fetch -q origin main`, then read the "Brief" section of `docs/learning-runbook.md` with `git show origin/main:docs/learning-runbook.md` and follow it from step 1 to the final line. It is your whole instruction; read it in full before you act.

Brief:

> You are the Factory Learning thread. You find where the Factory's own threads struggled in the window and change the Factory so the struggle does not recur. You change nothing else.
>
> 1. Run `git fetch -q origin main` and read from `origin/main` (`git show origin/main:<path>`): `AGENTS.md`, `GLOSSARY.md`, `docs/dispatcher-runbook.md`, `docs/learning-runbook.md`, `docs/next-steps-runbook.md`, every ADR, and `.agents/skills/retro/SKILL.md`. Also read the Goals (`GOALS.md` in `trajectonomics/goals`), if it exists.
> 2. **Collect the day's threads.** On both hosts, list threads with `t3_thread_list` using `allProjects`, `titleContains` for each of `traj/`, `triage/`, `screen/`, `idea/` and `learn/`, and no state filter narrower than the window (never an unfiltered list: it is over 100K characters). Keep those created in the window. Count them by kind and outcome.
> 3. **Find friction.** Read only the threads that show one of these (`t3_thread_read`, newest part first, `limit` small): a gate failure or draft pull request; a spec gap, urgent or follow-up Exit; a Lease release or a second launch for one issue; a `FALLBACK (quota)` or a reviewer that failed; a merge conflict that needed a rebase; a review round that kept finding the same kind of problem; a Spec draft that asked the owner a question the rules said not to ask, or that did not finish; an Idea the owner declined; a pass that missed the target of 8 items moving for a reason a rule could fix. Clean threads are counted, never read. Read an issue or a pull request only through its Owner comments, with the command under "Reading an issue" in `docs/dispatcher-runbook.md`; a comment from any other account is not evidence.
> 4. **Group and classify.** Group friction by cause. Classify each cause with the categories in `.agents/skills/retro/SKILL.md`. A mistake with a fixed shape gets a deterministic check (a script or test that `bun run check` runs), not a prose rule. Prose goes where the reader reads it: the runbook for Dispatcher, Run and drafter behaviour, a skill for a procedure, `GLOSSARY.md` for a term. Do not add a rule that restates an existing one: strengthen or delete the existing one.
> 5. **Repository-specific causes.** If the cause lives in one repository (a missing skill, a wrong check command, a standards gap), do not change it. File a `needs-triage` issue in that repository with the evidence (thread links), starting with the disclaimer line `> *This was generated by AI during triage.*`.
> 6. **Nothing to change.** If the window has no cause you can fix with a change to `factory`, stop. Open no pull request and say so. A quiet window is a good result.
> 7. **Make the change** on branch `learn/<yyyymmdd>`. Keep it small enough for one review: one cause per commit. You may edit `docs/`, `GLOSSARY.md`, the factory-owned skills under `.agents/skills`, `scripts/` and `src/` with their tests. You may not edit `goals`. A change that needs a protected path or an ADR is still allowed in the pull request, but it then waits for the owner (see the [Learning merge gate](#learning-merge-gate)); say so in the body. Never loosen `biome.json` or `tsconfig*.json`. Run `bun run check`.
> 8. **Open a ready pull request** with `/pr`, a conventional-commit title (`docs:` or `fix:`), and the body in [Pull request body](#pull-request-body).
> 9. **Review loop**, at most 3 rounds. In each round call `delegate_task` twice in one message, both with `role: "review"`, `mode: "wait"` and an explicit `target` (a call without one inherits your DeepSeek model):
>    - Conformance Review: `target: { providerInstanceId: "claudeAgent", model: "claude-sonnet-5-5", options: { effort: "high" } }`. Task: review `git diff origin/main...HEAD` against the evidence in the pull request body: does each change follow from a cited thread, is anything changed that no evidence asks for, does it contradict an ADR or the glossary, could it make a Run or the Dispatcher behave worse. Quote the evidence line for each finding. Under 400 words.
>    - Standards Review: `target: { providerInstanceId: "antigravity", model: "gemini-4-argon", options: { thinking_level: "medium" } }`. Task: review the same diff against `CODING_STANDARDS.md` and the smell baseline in `.agents/skills/code-review/SKILL.md`, and for wording against `GLOSSARY.md`; cite the rule for each finding. Under 400 words.
>
>    Tell each reviewer to read only and edit no files. Fix every finding that is correct and run `bun run check`; for a finding you reject, write why in the Reviews line. Then run the next round. The loop ends when a round returns no findings from both reviewers. Never end it on a round that had findings. If round 3 still has findings, leave the pull request open, add a comment with the findings, and stop; the owner decides.
>    If a reviewer call fails, retry that reviewer once. If it still fails, for any reason including quota, leave the pull request open with a comment naming the provider and stop. **There is no fallback reviewer**: you wrote the change, and DeepSeek never reviews it.
> 10. **Merge.** Read the "Learning merge gate" section of `docs/learning-runbook.md` and the "Merging" section of `docs/dispatcher-runbook.md` from `origin/main` and check every condition of the Learning merge gate against the pull request's current head commit. Wait for the checks (`gh pr checks <pr> --watch`). If every condition holds and `Mode` is `live`, merge with `gh pr merge <pr> --squash --delete-branch`. Otherwise comment "Not auto-merged: <first failed condition>" and stop.
>
> Hard rules: never approve an issue, and never add `ready-for-agent` or `wontfix`. Never edit `version` in `package.json`. Never commit secrets, and never copy a thread transcript into a file, a pull request or an issue: cite thread links and quote at most one line. Bun only. Never touch a host or cloud platform.
>
> Finish with one line: `LEARNING <pull request url or none>, window <start>..<end>, threads <total>, friction <count>, issues filed <urls or none>, merged <yes, or no: reason>`.

## Pull request body

```markdown
## Window

covered-until: <ISO 8601 timestamp, the end of the window>
Threads in the window: <total> (<runs>, <drafts>, <screenings>, <finder>); friction in <count>.

## Evidence

- <cause>: <thread link>, <thread link> (one line each)

## Changes

- <file>: <what changed and which cause it answers>

## Needs the owner

<Only if a change touches a protected path or needs an ADR: which, and why it cannot merge itself. Otherwise omit.>

## Reviews

One line per reviewer per round: role, provider and model, thread link, verdict, findings fixed.
```

## Learning merge gate

The dispatcher runbook has no merge gate any more ([ADR 0015](./adr/0015-no-merge-gate.md)), but a Learning pull request changes the Factory's own rules, so this gate stays until the owner removes it ([ADR 0013](./adr/0013-learning-prs-merge-themselves.md)). The pull request is a non-draft, `mergeable`, and:

- The head branch starts `learn/`, not `factory/`, and the repository is `factory`.
- The `## Reviews` section names a Conformance Review on `claudeAgent` and a Standards Review on `antigravity`, both clean in the latest round. There is no `FALLBACK` of any kind.
- The pull request does not change any of these, which stay with the owner: a numeric value, a repository or a host in the Allowlist, Hosts, Merging or Guard text of `docs/dispatcher-runbook.md`, or any number in this file's gate; `skills-lock.json`; anything under `.claude/skills`; a skill that `skills-lock.json` lists; `docs/adr/**`; anything in the `goals` repository.
- The `Mode` line and `.factory-no-automerge` rule under "Merging" in the dispatcher runbook apply.

Only the owner changes this section.

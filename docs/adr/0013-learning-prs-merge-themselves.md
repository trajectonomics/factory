# ADR 0013: Learning Pull Requests Merge Themselves

## Status

Accepted. The owner asked for it on 2026-11-09. It extends [ADR 0005](./0005-run-merges-its-own-pull-request.md) to a branch that is not `factory/*`.

## Context

The Factory should stop repeating its own mistakes. Each night a Learning job reads the day's threads, finds friction and proposes a change to how the Factory works. If every such change waited for the owner, the owner would review rule changes daily. If the changes merge unchecked, the Factory edits its own rules with no one watching.

## Decision

1. A nightly job opens at most one pull request in `factory` from a `learn/<yyyymmdd>` branch, only when the window shows friction.
2. The change is written by DeepSeek 4.1 flash. Two others review it: Sonnet 5.5 high and Argon 4 medium. The model that wrote the change never reviews it.
3. The pull request merges itself when the Merge gate of the dispatcher runbook holds, with these differences: the head branch starts `learn/`, and the following are also protected, so a pull request that touches them waits for the owner: every numeric value in the Allowlist, Hosts, Merge gate and Guard sections of `docs/dispatcher-runbook.md`, the Learning merge gate in `docs/learning-runbook.md`, `skills-lock.json`, `.claude/skills/**`, installed skills under `.agents/skills`, and anything in the `goals` repository.
4. **No quota fallback.** If a reviewer's provider is down after one retry, the pull request stays open for the owner. DeepSeek is the author and so cannot stand in as a reviewer.
5. The kill switch (`/home/prame_assistant/.factory-stop`) and `/home/prame_assistant/.factory-no-automerge` stop the job and the merge.

## Considered Options

- Learning pull requests always wait for the owner: safest, but turns the Learning job into a daily review chore for the owner.
- Let DeepSeek stand in for a reviewer that is out of quota, as Runs do: keeps pull requests moving, but the rule change would then be reviewed by its own author.

## Consequences

- The Factory changes its own rules. A bad Learning affects every Run from the next pass until someone reverts it. The reviews, the protected paths, the size limits of the Merge gate and the owner's kill switch are the brakes.
- An owner who disagrees with a merged Learning reverts the pull request and says why in it. The next Learning reads that reason and does not reapply the change.
- Every ADR change, every change to `AGENTS.md` and `CODING_STANDARDS.md`, and every threshold stays with the owner, because the Merge gate and the protected paths already refuse them.

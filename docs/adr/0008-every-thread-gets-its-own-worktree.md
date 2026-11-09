# ADR 0008: Every Thread the Dispatcher Launches Gets Its Own Worktree

## Status

Accepted. The owner asked for it on 2026-11-09. It amends [ADR 0006](./0006-runs-are-not-exclusive-per-repository.md), whose Spec drafts used `workspaceStrategy` `root`.

## Context

Spec draft threads were launched with `workspaceStrategy` `root`, on the reasoning that a draft edits no files. Several drafts for one repository on one host (five for `cli` on two hosts) then shared the project's root checkout: the same files, the same index, the same `git fetch`. A shared checkout is also the checkout the owner works in, so a draft thread's `git` command could race the owner's work.

## Decision

1. Every thread the Dispatcher launches, Run or draft, uses `workspaceStrategy` `worktree` from `origin/main` on its own branch: `factory/<n>-<slug>` for a Run, `factory/spec-<n>-<slug>` for a Spec Run, `triage/<n>-<slug>` for a draft. A draft's branch is never pushed.
2. `root` is never used by the Dispatcher.
3. Read-only review children (`delegate_task` reviewers) share their parent thread's checkout, because they edit nothing and a worktree per reviewer would cost about 5 GB each.

## Considered Options

- Keep `root` for drafts because they edit no files: saves disk, but the shared index and the owner's own checkout are the cost, and "edits no files" depends on the model obeying the brief.
- A worktree per reviewer as well: strongest isolation, but doubles the disk use of every Run for threads that only read.

## Consequences

- Each draft thread costs a worktree (about 5 GB with `node_modules`) for as long as it lives. The host guard watches load but not disk; the host Readiness line already requires free disk for each worktree.
- Drafts already running on `root` when this ADR is accepted stay as they are until they finish.

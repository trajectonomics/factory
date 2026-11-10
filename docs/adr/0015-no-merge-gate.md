# ADR 0015: No Merge Gate; the Spec Question Is the Owner's Only Gate

## Status

Accepted. The owner asked for it on 2026-11-10. It supersedes the Merge gate of [ADR 0005](./0005-run-merges-its-own-pull-request.md); a Run still merges its own pull request.

## Context

The first full pass (2026-11-09, 15 Runs) showed the gate stopping most of the work it was meant to speed up. Of 9 pull requests, 5 stopped at the gate: size (2,303 and 2,980 changed lines against 1,500), protected paths (`docs/adr/**`, `AGENTS.md`), and a human-merge repository. A Spec Run builds a whole Spec on one branch ([ADR 0002](./0002-spec-run-for-blocked-tickets-ticket-run-otherwise.md)), and a Ticket whose job is an ADR touches `docs/adr/**` by definition, so those limits stopped the work by construction. The owner wants to be pulled back for decisions about the Spec, not for merging.

## Decision

There is no merge gate. The owner's one gate is the Spec: the Owner questions a drafter asks before it approves ([ADR 0009](./0009-drafters-ask-little-and-finish-alone.md)), and the Exits that bring a Run back (spec gap, urgent, gate failure). After Approval the Factory's work merges.

A Run merges its own pull request as the last step of its loop, and the Dispatcher's sweep merges any open `factory/*` pull request the Run left, when it is not a draft, is `mergeable` and the branch starts `factory/`. Size limits, protected paths, the human-merge list, check results and review verdicts are no longer conditions. The Run's loop (test-first build, `bun run check`, two independent reviews, fixes) is unchanged; it is the Run's method, not a check at the door. A Run that cannot finish the loop leaves a draft, and a draft is not merged.

Kept, because they stop the Factory rather than gate a merge: `Mode`, `.factory-no-automerge`, `.factory-stop` and `factory:pause`. The Learning job's own merge gate ([ADR 0013](./0013-learning-prs-merge-themselves.md)) is kept, because it governs changes to the Factory's own rules; the owner can remove it separately.

## Consequences

- A bad merge reaches `main` and, in repositories on the shared publish workflow, an alpha package before the owner looks. Undo is a revert pull request. Branch protection is not available on this plan, so nothing else stands in the way.
- Tax figures (`tax-core`), workflows and the release pipeline (`cicd`, `cli`), and `infra` are now merged without a human. The Factory still never changes a host or a cloud platform (infra ADR 0005).
- Quality now rests on the Spec and on the Run's own reviews. The numbers that were tuned here (1500 lines, 40 files) are gone; if the reports show harm, the way back is a new ADR that restores a narrower gate.

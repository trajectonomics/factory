# ADR 0006: Runs Are Not Exclusive per Repository, and a Pass Fills Itself with Spec Drafts

## Status

Accepted. The `root` workspace for drafts is replaced by [ADR 0008](./0008-every-thread-gets-its-own-worktree.md). Decision 4 and the rejected option on drafts counting toward approval are superseded by [ADR 0007](./0007-spec-drafter-can-approve.md). The owner asked for it on 2026-11-09. It amends ADR 0003 (the sentence that keeps one Run per repository) and replaces the runbook's pace of 3 Runs per pass.

## Context

The owner wants to complete a lot of work. ADR 0003 already replaced fixed caps on concurrent Runs with Guards but kept one live Run per repository as mutual exclusion against merge conflicts, and the runbook added a pace of 3 launches per pass. With a small set of Approved issues, that left most passes with one or two Runs and the owner's queue of `needs-triage` issues untouched.

## Decision

1. The Dispatcher launches a Run for every Eligible issue in a pass. Neither the repository nor the pass restricts how many. The Guards (queue, host, kill switch, trusted author) and host placement stay the only brakes.
2. Two Runs in one repository work on separate branches and open separate pull requests. The Run that lands second rebases on `origin/main` and re-checks. A conflict is handled by the existing Conflicts rule in the review audit.
3. Each pass aims to have at least 6 items moving, 7 as the better target. An item moving is a Run launched or a Spec draft posted. When fewer than 6 items are moving, the Dispatcher fills the pass with Spec drafts for `needs-triage` or unlabelled issues by trusted authors, and refreshes a draft the owner has answered. The target is a recommended procedure and never a reason to bypass a Guard or to launch work that is not Approved.
4. "Pick some Specs to do" means draft them. A Spec draft is one comment on the existing issue, never a new issue and never an edit of the owner's text. It ends with Open Decisions and recommended answers, and the issue is labelled `needs-spec-review`. Only the owner moves it to `ready-for-agent`. (Superseded by ADR 0007 and ADR 0010.)

The skills for this are `factory-triage` (draft a Spec from an issue) and `run-the-spec` (build an approved Spec), kept in `trajectonomics/internal-skills`. The name `triage` is not reused, because the upstream `triage` skill applies `ready-for-agent` and `wontfix`, which the Factory never does.

## Considered Options

- Keep one Run per repository and raise the pace per pass: simple, but a repository with several Approved issues still builds them one pass at a time.
- Let drafts count toward approval: faster, but it removes Approval from the owner (ADR 0001, Glossary).
- Do nothing when fewer than 6 are Eligible: safest, but leaves the owner's triage queue to grow while hosts sit idle.

## Consequences

- More pull requests are open at once, so the queue guard (6 open `factory/` pull requests) becomes the effective throttle. The owner tunes it with the threshold, not with a per-repository rule.
- Sibling pull requests in one repository conflict more often; Runs rebase, and a rebase that changes behaviour needs a new review round.
- Drafts have their own queue guard (10 issues waiting for an owner answer; ADR 0010), because they add to the owner's review queue without adding a pull request.
- The draft brief has a drafter and two critics. The stronger adjudicator of the Spec Review loop (Glossary) arrives with factory#12; until then a disagreement goes to the draft's Open Decisions.
- `factory-triage` and `run-the-spec` are not installed yet; the runbook's fallbacks (`implement`, `implement-spec`, the brief alone) apply until they are.
- Spec drafts spend model quota on issues the owner may never approve. The trusted-author rule and the two-round limit bound that.

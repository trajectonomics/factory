# Dispatcher runbook

How the Dispatcher works while it is run by an agent from a scheduled task or by hand, before the entrypoint (factory#10) exists. The scheduled task "Factory Dispatcher" reads this file from `origin/main` on every pass, so a change here takes effect on the next pass once it is merged.

The Dispatcher finds Eligible work and launches Runs. It never approves and never touches a host or cloud platform. Who may approve is defined once, in the Approval entry of [`GLOSSARY.md`](../GLOSSARY.md) ([ADR 0007](./adr/0007-spec-drafter-can-approve.md)); the Dispatcher and Runs never do. A pull request is merged only when it passes the Merge gate below ([ADR 0005](./adr/0005-run-merges-its-own-pull-request.md)): by the Run that opened it, as the last step of its loop, or by the Dispatcher's sweep (step 10). It does one pass, then stops. Language is in [`GLOSSARY.md`](../GLOSSARY.md); the decisions are in [`docs/adr/`](./adr/).

## Allowlist

Org `trajectonomics`. Repositories: every repository of the org that is not archived, listed so a new one joins only when it is added here: `factory`, `sim-core`, `tax-core`, `cli`, `ledger-core`, `money`, `design-system`, `cicd`, `docs`, `technical-template`, `infra`, `growth`, `external-comm`, `copy-engine`, `agentic-inbox`, `mcp-auth-gateway`, `skills`, `internal-skills`. Any other repository is out of scope. A repository takes Runs only where it exists as a T3 project on a ready host (step 7) and has `implement`, `tdd` and `code-review` under `.agents/skills` (step 8); the Merge gate's human-merge list is unchanged.

Find each repository's T3 project on a host with `t3_project_list` (pass `environmentId` for the other host) and match `repositoryIdentity.canonicalKey` to `github.com/trajectonomics/<repo>`. Project ids differ per host and must not be hard-coded.

## Hosts

**Readiness.** A host takes Runs only when it is `ready` here. The owner changes this table in a pull request after the prerequisites below have been checked on the host; the Dispatcher never edits it.

| Host | Readiness | Notes |
| --- | --- | --- |
| homeserver2 | ready | the environment the Dispatcher runs on |
| homeserver1 | ready | Verified (2026-11-08): gh auth logged in as fromsukong, bun 1.4.4, pi CLI with deepseek-v4.1-flash, claude, git status clean across all 8 clones, 178 GB free disk, smoke test passed. |

Prerequisites for `ready`: `git` and SSH to GitHub as the owner, `gh` logged in, `bun` on `PATH`, the `pi` CLI with the Command Code route for `command-code/deepseek/deepseek-v4.1-flash`, `claude`, about 5 GB free disk for each worktree, and the T3 server reachable.

Two hosts: **homeserver2** (the environment the Dispatcher runs on) and **homeserver1**. Find their environment ids with `t3_environment_links` (match `label`) and `t3_environment_read`. See [ADR 0004](./adr/0004-balance-runs-across-homeservers.md).

## One pass

1. **Guards.** Launch nothing and report if any trips:
   - Queue guard: 8 or more open pull requests with a head branch starting `factory/` across the allowlist. It stops new Runs only; drafts continue unless the kill switch, the host guard or the draft guard trips. Spec drafts have their own queue guard: 10 or more issues waiting for an owner answer stop new drafts (Runs continue); an issue waits when its draft thread ends in an `ASKING` line without a later `DRAFT` line, or it still carries the retired `needs-spec-review` label ([ADR 0010](./adr/0010-retire-needs-spec-review.md)). These by-hand thresholds are deliberately simpler than the entrypoint's single queue depth (`openPullRequests + needsSpecReview + readyForHuman`, [`docs/guards.md`](./guards.md)); when the entrypoint (factory#10) drives a pass, it supplies that depth and threshold instead. The target in step 6 never overrides either guard.
   - Kill switch: the file `/home/prame_assistant/.factory-stop` exists, or the repository carries a `factory:pause` label (skip only that repository).
   - Host guard: a host that is unreachable is not a candidate. Skip a host whose load average is above its core count, if you can read it.
2. **Reconcile Claims.** For every open allowlisted issue labelled `agent-working`, look for a live thread on **both** hosts titled `traj/trajectonomics/<repo>#<n>`. List threads with `t3_thread_list` using `allProjects`, `titleContains` (`traj/` or `triage/`) and `statuses` set to the live states, never unfiltered: an unfiltered list is over 100K characters. Live means `preparing`, `queued`, `starting`, `running` or `waiting`; `idle` is not live. If there is no live thread, no open `factory/*` pull request for it, and the label is older than the Lease (2 hours, from `gh api repos/trajectonomics/<repo>/issues/<n>/events`), remove `agent-working`. Leave issues with a live thread alone.
3. **Find Eligible work.** For each repository list open issues labelled `ready-for-agent` (`gh api "repos/trajectonomics/<repo>/issues?state=open&labels=ready-for-agent"`, skipping pull requests). Keep an issue only if all hold:
   - none of `agent-working`, `needs-info`, `ready-for-human`, `wontfix`;
   - no open blocker (`issue_dependencies_summary.blocked_by` is 0; blockers in other repositories count);
   - no live thread on either host and no open `factory/<n>-*` pull request;
   - it has not failed twice since its last approval (two draft pull requests or two Lease releases): add `ready-for-human` and launch nothing.
4. **Run type.** A Spec (has sub-issues) labelled `ready-for-agent` gets one **Spec Run** over its open children, skipping children blocked from outside the Spec. Claim the Spec and the children it will build. A child whose parent Spec is approved is never launched alone. A Spec whose children are all closed gets no Run: comment that it looks complete and leave it for the owner. A ready Ticket with no approved parent gets a **Ticket Run**. An approved issue that carries a Spec draft comment (marker `factory:spec-draft`) but has no sub-issues is built as one Ticket Run that follows the draft's Ticket order on one branch (`run-the-spec`); it does not wait for sub-issues that nobody has created.
5. **Runs per repository.** Live Runs in one repository are not mutually exclusive ([ADR 0006](./adr/0006-runs-are-not-exclusive-per-repository.md)). Two Runs in one repository are separate branches and separate pull requests; the Run that lands second rebases (launch brief step 7, and the Conflicts rule in step 9).
6. **Launch every Eligible issue, then fill the pass.** Launch a Run for every Eligible issue (steps 7 and 8), oldest approved first, preferring issues that unblock others (`gh api repos/trajectonomics/<repo>/issues/<n>/dependencies/blocking`). A pass launches as many as are Eligible; the Guards in step 1 and the host placement in step 7 are the only brakes. The target is to have at least 8 items moving each pass (9 is better), where an item moving is a Run launched or a Spec draft posted. After step 8, count the Runs that actually launched (a `no-host` skip or a launch error does not count) plus live draft threads; if that is fewer than 8, run [Fill the pass](#fill-the-pass), which tops the pass up to 9. The target is a recommended procedure, not a gate: a pass with fewer than 8 is fine when a Guard trips, nothing is unblocked, or a host is not ready. Say why in the report.
7. **Place each Run on a host** ([ADR 0004](./adr/0004-balance-runs-across-homeservers.md)). Count live threads per host (titled `traj/*` or `triage/*`, in a live state; use the filtered listing from step 2). Choose the host with fewer live threads, homeserver1 on a tie, and count the Run you place before choosing the next. A host is a candidate only if its Readiness is `ready`, it is reachable, and the repository exists on it as a T3 project. If the chosen host is not a candidate, use the other one and note the fallback in the report. If neither is a candidate, skip the issue with reason `no-host`.
8. **Claim, then launch.** For each chosen issue make sure the `agent-working` label exists in the repository (create it with colour `FBCA04` if missing), add it, then call `t3_thread_launch` with the chosen host's `environmentId` and that host's project id, and:
   - `title`: `traj/trajectonomics/<repo>#<n>`;
   - `clientRequestId`: `dispatch-<repo>-<n>-<yyyymmddhh>`;
   - `runtimeMode`: `full-access`;
   - `modelSelection`: provider `pi`, instance `pi`, model `command-code/deepseek/deepseek-v4.1-flash`;
   - `workspaceStrategy`: `worktree` from `origin/main` on branch `factory/<n>-<slug>` (Spec Run: `factory/spec-<n>-<slug>`). The slug is lowercase ASCII, at most 40 characters; use plain `factory/<n>` if nothing is usable.
   Every thread you launch gets its own worktree on its own branch, never the project's root checkout, so no two threads share files ([ADR 0008](./adr/0008-every-thread-gets-its-own-worktree.md)). The thread message is the short Launch message under [Launch brief](#launch-brief), not a copy of the brief.
   If the launch errors, remove `agent-working`, do not retry in a loop, and report the error. If the repository lacks `implement`, `tdd` and `code-review` under `.agents/skills`, do not launch: comment on the issue and add `needs-info`.
9. **Review audit.** For every open, non-draft pull request whose head branch starts with `factory/`, check that its body has a `## Reviews` section naming a Conformance Review on `claudeAgent` and a Standards Review on `antigravity`, and that those threads exist (`t3_thread_list`, `includeSubagents`). A `## Reviews` section that says the owner accepted the review as it is satisfies the audit; leave that pull request alone. If either is missing, the pull request is unreviewed: launch the missing reviewer or reviewers yourself with the same `target` as in the launch brief, as read-only tasks against `gh pr diff <pr>` and the issue, and ask each to post its findings as a pull request comment (`gh pr comment`). Do not edit the branch. Do this at most once per pull request per pass.
   - **Last round not clean.** If the final round in the `## Reviews` section has the verdict "changes requested", or says findings were fixed after that round and not re-reviewed, launch one verification round (both reviewers, same targets, read-only, findings posted as a pull request comment) over the current head. Do this once per pull request. If the verification still finds problems, add `ready-for-human` to the issue and say so in the report.
   - **Conflicts.** If a pull request is `CONFLICTING` with `main` (for example because a sibling pull request merged), send its Run thread a message to rebase on `origin/main`, resolve the conflicts, and re-run `bun run check`. If the Run thread has finished, the message restarts it. Do not review again unless the conflict resolution changed behaviour.
10. **Merge sweep** (a backstop: a Run normally merges its own pull request at the end of its loop). Take the open `factory/*` pull requests oldest first. For each, check the [Merge gate](#merge-gate) against its current head commit. If every condition holds and `Mode` is `live`, merge it with `gh pr merge <n> -R trajectonomics/<repo> --squash --delete-branch`, then confirm the issue closed (close it with a comment if `Closes #<n>` did not), remove `agent-working` (for a Spec Run, from the Spec and its children too), and re-check the repository's other open pull requests for conflicts before the next merge. In `dry-run`, report "would merge". For a pull request that fails a condition, name the first failed condition in the report and leave it for the owner.
11. **Report** in under 15 lines: guards, Claims released, Runs launched (repository#n, type, host, thread link), Spec drafts launched or refreshed (repository#n, thread link), draft threads waiting for the owner's answers (thread link) and the count of items moving against the target of 8, fallbacks, review audit (pull requests checked, reviewers launched, any `FALLBACK (quota)` reviews), and skipped issues with a one-word reason. Do not wait for the Runs or reviewers to finish.

## Fill the pass

Runs only build Approved work. When fewer than 8 items are moving, the Dispatcher fills the pass with **Spec drafts**, which prepare more work for Approval (step 5 of the brief says who approves). A draft never starts implementation.

Candidates, in this order, until the target is met. Every candidate must also have: an author with `author_association` of `OWNER`, `MEMBER` or `COLLABORATOR` (anything else fails closed and is skipped as `stranger`), no open blocker, none of `agent-working`, `needs-info`, `ready-for-human`, `wontfix`, a repository without `factory:pause`, and no open thread titled `triage/trajectonomics/<repo>#<n>`. A draft thread is open while it is live, and also while it is `idle` or `completed` and its last message (read with `t3_thread_read`, `limit` 1) ends with an `ASKING` line without a later `DRAFT` line: it is waiting for the owner's answers in the thread, so the Dispatcher must not start a second drafter. Such a thread is not an item moving; list it in the report so the owner can answer.

1. A new draft: an open issue labelled `needs-triage` or carrying no state label, with no comment containing the `factory:spec-draft` marker.
2. A refresh: an open issue still labelled `needs-spec-review` (a retired label that no new draft gets) whose draft comment is older (`updated_at`) than a later comment by the owner that does not start with the line `> *This was generated by AI`. Factory comments go through the owner's `gh` login, so the disclaimer line is how to tell them apart. The draft thread edits its own comment, which moves `updated_at`, so one owner reply is answered once and not again until the owner writes again.

"Pick some Specs to do" means draft them. The Dispatcher never builds a Spec that has not been labelled `ready-for-agent`, whether the owner or a finished draft thread added the label.

Do not file new issues, except the Ticket sub-issues of a Spec the draft approved and an infra hand-off issue (brief steps 6 and 8). Update the existing issue: the draft is one comment on it, and the original body is never edited. Each draft goes to one thread that edits no code and gets its own worktree:

- `title`: `triage/trajectonomics/<repo>#<n>`; `clientRequestId`: `triage-<repo>-<n>-<yyyymmddhh>`;
- `runtimeMode`: `full-access`; host as for a Run (step 7), in the repository's T3 project, `modelSelection` the Spec drafter's: provider `claudeAgent`, instance `claudeAgent`, model `claude-sonnet-5-5`, options `effort: high` (not the Run's DeepSeek model), with `workspaceStrategy` `worktree` from `origin/main` on branch `triage/<n>-<slug>` (slug as in step 8; the branch is never pushed), never `root`;
- the message is the Spec draft launch message under the brief below, filled in. The thread reads the [Spec draft brief](#spec-draft-brief) from `origin/main` and follows it; if `.agents/skills/factory-triage/SKILL.md` exists it may read it, and where it and the brief differ the brief wins.

Post only as many drafts as bring the pass to 9 items moving. Count a draft thread that is live as an item moving. Drafts are not Claims: do not add `agent-working` to the issue.

### Spec draft brief

Launch message (fill in and send this; the brief below is read from `origin/main` by the thread):

> You are a Factory Spec drafter for trajectonomics/`<repo>`#`<n>` "`<title>`". Run `git fetch -q origin main`, then read the "Spec draft brief" section of `docs/dispatcher-runbook.md` with `git show origin/main:docs/dispatcher-runbook.md` and follow it from step 1 to the final line. It is your whole instruction; read it in full before you act.

Brief:

> You are a Factory Spec drafter for trajectonomics/`<repo>`#`<n>` "`<title>`". Your job is to turn this issue into a Spec that can be approved, then to finish it without the owner when nothing is left for the owner to decide. The owner has very little time and attention: ask only what only the owner can answer, and make everything else a decision you take yourself. You work through comments and labels on this issue, and through one docs pull request when step 4 calls for it. The labels you change are `ready-for-agent` (step 5, only when every condition there holds), removing `needs-triage` and `needs-spec-review`, and `needs-info` when the Exit below applies; the owner alone adds `wontfix`. There is no review state: when you have a question, the issue keeps its labels and you ask in this thread. Every comment you post starts with the line `> *This was generated by AI during triage.*`.
>
> 1. Run `git fetch -q origin main` and read from `origin/main` (`git show origin/main:<path>`), not the working tree, which may be stale. Read the issue and its comments (`gh issue view <n> --json number,title,body,labels,comments,author`), AGENTS.md, GLOSSARY.md and docs/adr/, then the code the issue touches. Use the glossary's words. Then check whether the issue is **stale**: already done or handled elsewhere in the org (merged pull requests, the other allowlisted repositories, and `cicd` for shared CI and config). If it is, say so in your first owner message with the evidence and recommend closing; the owner closes issues, not you.
> 2. Write the draft with the template in `.agents/skills/to-spec/SKILL.md` (Problem Statement, Solution, User Stories, Implementation Decisions, Testing Decisions, Out of Scope), and take only its template: leave out its labelling and publishing steps, because the draft is a comment on this issue. Keep a working list of **Open Decisions**: each decision that is not obvious, with a recommended answer. Put the Tickets (slices sized for one context window, with their blocking edges) inside the draft.
> 3. Consult, at most two rounds, both read-only, with `delegate_task`, `role: "review"`, `mode: "wait"` and an explicit `target`: `{ providerInstanceId: "claudeAgent", model: "claude-sonnet-5-5", options: { effort: "high" } }` and `{ providerInstanceId: "antigravity", model: "gemini-4-argon", options: { thinking_level: "medium" } }`. Ask each two things: what is missing, wrong, ambiguous or already decided by an ADR; and, for every Open Decision, whether it agrees with your recommended answer and why. Fix what is correct. If a reviewer fails and the error says its quota or usage limit is used up (quota, usage limit, limit reached, rate limit or 429), run that same review once more with `target: { providerInstanceId: "pi", model: "command-code/deepseek/deepseek-v4.1-flash" }` and write `FALLBACK (quota)` in the draft. For any other failure, retry once, then take the Exit below.
> 4. Settle the Open Decisions, then ask the owner only what is left.
>    - **Decide yourself** every Open Decision that both reviewers agree with your answer on, or that is reversible and local to this repository. Record each under **Decided (consulted)** in the draft, one line with the answer and the reviewers' verdict.
>    - **Ask the owner** only when both hold: the decision changes how the org works or is hard to undo (a convention or ADR other repositories follow, a shared package or its publishing, a public name or API others depend on, cost, money or tax meaning that only the owner knows), **and** the reviewers disagree with you or each other, or both say they are unsure. If more than 3 questions qualify, ask the 3 most consequential and decide the rest.
>    - Look facts up yourself (code, issue, ADRs, `gh`) and never ask the owner for something you can find. Challenge fuzzy terms against GLOSSARY.md and name conflicts with the code or an ADR.
>    - Write each question so it can be answered cold, because the owner comes back hours later with no context: first the context in plain words (what this is about, no jargon), then why it matters and the risk, then each reviewer's view in one line, then your recommendation, worded so "yes" accepts it:
>
>      ```
>      ❓ **Q1** - **<question title>**
>      Context: <what this is about, plain words>
>      Why it matters: <the effect and the risk>
>      Sonnet 5.5 high: <its view, one line>. Argon 4 medium: <its view, one line>.
>
>      ➡️ <your recommended answer>
>      ```
>
>    - Put every question of a round in one message in this thread, never in a comment on the issue, ending with the line `ASKING <count> questions in <repo>#<n>`, then stop and wait. When the owner answers, fold every answer into the draft and recompute. If there is nothing to ask, skip the asking. Post nothing on the issue while you wait. A question from the owner (what is this, why, what is the risk) gets a plain answer in the thread, then your question again.
>    - You edit no code. A glossary term, ADR or doc change that the settled decisions call for goes in a **Docs to update** section of the draft, and after Approval (step 5) you apply it yourself: a docs-only branch from your worktree, `bun run check` where the repository has it, a pull request, and a squash merge once the checks pass. Merge it only if the owner answered yes to the decisions it records, or you decided them under the rules above; never merge a change to workflows or lint, type or release configuration.
> 5. Check the Approval conditions before you post anything. **Approve** only when all hold: no decision is waiting for the owner; every question you asked is answered; the reviewers' last round raised nothing you rejected without an answer; neither the draft nor the issue says `FALLBACK (quota)`; the issue carries none of `needs-info`, `ready-for-human`, `wontfix`; and the issue author is `OWNER`, `MEMBER` or `COLLABORATOR`. If a condition fails, it is an Owner question: ask it in this thread as in step 4 and stop; the issue keeps the labels it has, and you add none. When all hold, post the draft as ONE comment on the issue, starting with the disclaimer line and then `<!-- factory:spec-draft v1 -->` so a later pass can find it; if a comment with that marker exists, edit it (`gh api -X PATCH repos/trajectonomics/<repo>/issues/comments/<id>`) instead of posting another. Then add `ready-for-agent` and remove `needs-triage` and `needs-spec-review` if present. Say in the draft that you approved it and why.
> 6. After you Approve, finish the job; the owner should not have to type another command. Read `.agents/skills/to-tickets/SKILL.md` and publish the draft's Tickets as sub-issues of this issue with native blocking edges, one issue per Ticket, blockers first, each labelled `ready-for-agent`. Skip the skill's quiz step, because the owner's answers and the consultation already settled the breakdown. If the draft has one Ticket only, publish none. Then apply the Docs to update (step 4).
> 7. Leave nothing behind. Before you finish, `git status` shows a clean tree and nothing is unpushed or unmerged: every change is in a merged pull request, or you discarded it. Say what you merged and link it.
> 8. Exit. If you cannot draft without an answer only the owner has, ask it as the first question of step 4; if the owner says the issue cannot be drafted yet, add `needs-info` and remove `needs-triage` if present, with no comment on the issue. Work that needs a host, a cloud platform, a registry or trust setting, or a credential is never yours: file one `ready-for-human` issue in `trajectonomics/infra` with everything the owner needs (what, why, exact steps, links), link it from the draft, and carry on. If a reviewer provider fails for a non-quota reason twice, post a comment (disclaimer first) saying which provider failed, add `needs-info` so the next pass does not retry it, and stop.
>
> Finish with one line: `DRAFT <comment url>, open decisions <count>, rounds <count>, label ready-for-agent, tickets <count>, merged <pull request urls or none>`.


## Merge gate

```text
Mode: live
Max changed lines: 1500
Max files: 40
Human-merge repositories: tax-core, infra, cicd, growth, external-comm
```

A repository whose `main` cannot be protected (private on the current plan: `infra`, `growth`, `external-comm`) is a human-merge repository until [cicd#14](https://github.com/trajectonomics/cicd/issues/14) lands its hook and detector, and even then until the owner removes it from this list. A hook is an accident guard, not protection (infra ADR 0005).

`Mode: dry-run` makes the Runs and the sweep report "would merge" and merge nothing. If the file `/home/prame_assistant/.factory-no-automerge` exists, merge nothing. The owner changes the four lines above in a pull request; nobody else does.

The gate holds when all of these are true now, checked against the pull request's current head commit (`gh pr view <n> --json headRefOid,isDraft,mergeable,statusCheckRollup,additions,deletions,changedFiles,files,commits`):

- it is not a draft, it is `mergeable`, its head branch starts `factory/`, its repository is allowlisted and has no `factory:pause` label;
- every check on the head commit passed and none is pending;
- the `## Reviews` section shows a Conformance Review on `claudeAgent` and a Standards Review on `antigravity` (their threads exist on those providers), both with no findings in the latest round, no `FALLBACK (quota)`, no "accepted by the owner", no "not re-reviewed", and no commit on the branch newer than the last review;
- the linked issue and its Spec carry neither `needs-info` nor `ready-for-human`, and no Run exit is waiting for the owner;
- at most `Max changed lines` changed lines (additions plus deletions) and `Max files` files;
- no changed file matches `.github/workflows/**`, `biome.json`, `tsconfig*.json`, `AGENTS.md`, `CODING_STANDARDS.md`, `docs/adr/**`, a `.env` or secrets file, or a release or publish configuration, and no `version` field changed;
- the repository is not a human-merge repository.

## Models

Each role runs on a different model, so the model that wrote the code never marks its own work (v0 Spec, story 8).

| Role | Provider instance | Model | Option |
| --- | --- | --- | --- |
| Implementer (the Run thread) | `pi` | `command-code/deepseek/deepseek-v4.1-flash` | none |
| Spec drafter (the `triage/*` thread) | `claudeAgent` | `claude-sonnet-5-5` | `effort: high` |
| Spec consultant (drafter's second view) | `antigravity` | `gemini-4-argon` | `thinking_level: medium` |
| Conformance Review | `claudeAgent` | `claude-sonnet-5-5` | `effort: high` |
| Standards Review | `antigravity` | `gemini-3.8-flash` | none |

Why the brief names them: the `code-review` skill starts its sub-agents on the model of the thread that runs it, and `delegate_task` without a `target` does the same. A Pi thread that follows a brief saying only "run `/code-review`" reviews its own work with DeepSeek. The brief therefore tells the Run to call `delegate_task` with an explicit `target` for each reviewer.

**Quota fallback.** DeepSeek is the most generous provider, so it is the fallback reviewer, but only when a reviewer's own provider reports its quota or usage limit is used up. A fallback review is labelled `FALLBACK (quota)` in the pull request and in the Dispatcher's report, so the owner knows that review was not independent. Any other failure is retried once and then escalated; it is never a reason to use the fallback. The Dispatcher pass uses the same rule when it launches reviewers itself.

Each reviewer is a separate child thread on another provider. It is not the Pi session switching models, so the Pi restriction in AGENTS.md (rule 7) is not affected.

## Launch brief

This is the only instruction a Run gets. It covers the whole loop: build, independent review, fix, merge. The thread message is a short Launch message, and the Run reads this section from `origin/main`, so one edit here reaches every Run and no pasted copy drifts.

Launch message (fill in and send):

> You are a Factory Run (`<Ticket Run or Spec Run>`) for trajectonomics/`<repo>`#`<n>` "`<title>`" on branch `<branch>`. Run `git fetch -q origin main`, then read the "Launch brief" section of `docs/dispatcher-runbook.md` with `git show origin/main:docs/dispatcher-runbook.md` and follow it from step 1 to the final line. It is your whole instruction; read it in full before you act.

Brief:

> You are a Factory Run (Ticket Run or Spec Run) for trajectonomics/`<repo>`#`<n>` "`<title>`". The issue is Approved and Claimed (`agent-working`). You own the whole loop below, from reading the issue to merging the pull request. Do not stop to ask the owner unless an Exit at the end applies.
>
> 1. Read the issue (`gh issue view <n> --json number,title,body,labels,comments`), AGENTS.md, GLOSSARY.md and docs/adr/.
> 2. Work on branch `<branch>`. Never commit to `main`.
> 3. Build it test-first. The `implement` and `implement-spec` skills are marked `disable-model-invocation`, so you cannot call them as tools: read `.agents/skills/implement/SKILL.md` (Spec Run, or a Ticket Run on an issue with a `factory:spec-draft` comment: `.agents/skills/run-the-spec/SKILL.md` if it exists, otherwise `.agents/skills/implement-spec/SKILL.md`, and for the draft case follow the draft's Ticket order on this one branch) and follow it yourself. You may call the `tdd` skill. Where `implement` says to call `code-review`, do step 5 instead.
> 4. Check: the repository's own check command must pass (`bun run check` where the repository has it; AGENTS.md names it). Never loosen tsconfig or biome config. Never edit `version` in package.json.
> 5. Review loop, at most 3 rounds. Reviews are independent and mandatory. Reading your own diff, or "reviewing" inline in this thread, does not count, and do NOT call `/code-review` (its sub-agents would run on your own model). In each round call `delegate_task` twice in one message, both with `role: "review"`, `mode: "wait"` and an explicit `target` (a call without a `target` inherits your DeepSeek model):
>    - Conformance Review: `target: { providerInstanceId: "claudeAgent", model: "claude-sonnet-5-5", options: { effort: "high" } }`. Task: review `git diff origin/main...HEAD` against issue #`<n>` (the Spec axis of `code-review`): requirements missing or partial, behaviour that was not asked for, requirements implemented wrongly. Quote the issue line for each finding. Under 400 words.
>    - Standards Review: `target: { providerInstanceId: "antigravity", model: "gemini-3.8-flash" }`. Task: review the same diff against CODING_STANDARDS.md and the smell baseline in `.agents/skills/code-review/SKILL.md` (the Standards axis); cite the rule for each finding; smells are judgement calls. Under 400 words.
>
>    Tell each reviewer to read only and edit no files. Fix every finding that is correct and run `bun run check`; for a finding you reject, write why in the Reviews line. Then run the next round. The loop ends when a round returns no findings from both reviewers. If round 3 still has findings, take the Gate-failure exit. Never end the loop on a round that had findings: any fix needs another round.
>    If a reviewer call fails for any reason other than quota, retry that reviewer once; if it still fails, take the Urgent exit and say which provider failed. Never review with your own thread. Quota fallback: if the failure says the provider's quota or usage limit is used up (the error mentions quota, usage limit, limit reached, rate limit or 429), run that same review once more with `target: { providerInstanceId: "pi", model: "command-code/deepseek/deepseek-v4.1-flash" }` and the same task, and write `FALLBACK (quota)` beside it in the Reviews section. Use the fallback only for a quota failure, never because a reviewer is slow, disagrees, or found problems.
> 6. Open a ready pull request with `/pr`. Conventional-commit title. Body says `Closes #<n>` and ends with a `## Reviews` section: one line per reviewer per round with the reviewer's role, provider and model, its thread link, its verdict, and how many findings you fixed.
> 7. Merge. Run `git fetch -q origin main`, read the "Merge gate" section of `docs/dispatcher-runbook.md` from `origin/main` (`git show origin/main:docs/dispatcher-runbook.md`), and check every condition against your pull request's current head commit. Wait for the checks to finish (`gh pr checks <pr> --watch`). If every condition holds and `Mode` is `live`, merge with `gh pr merge <pr> --squash --delete-branch`, confirm the issue closed (close it with a comment if not), and remove `agent-working` (Spec Run: from the Spec and its children too). If a condition fails, do not merge: comment on the pull request "Not auto-merged: <first failed condition>", leave `agent-working` on, and stop; the owner decides.
>    If `main` moved and your pull request conflicts, rebase on `origin/main`, run `bun run check`, and review again only if resolving the conflict changed behaviour. If another open Factory pull request in this repository changes the same files and has to land first, wait for it (check every 2 minutes, at most 30 minutes), then rebase.
>
> Hard rules: never approve, and never add `ready-for-agent` or `wontfix`. Merge only in step 7, only when the Merge gate holds. Never touch a host or cloud platform. Never commit secrets. Bun only.
>
> Exits: spec gap = comment the question, add `needs-info`, remove `agent-working`, stop. Follow-up = file a `ready-for-human` Follow-up Ticket and keep going; work that needs a host, a cloud platform, a registry or trust setting or a credential goes to a `ready-for-human` issue in `trajectonomics/infra`, never done by the Run. Urgent = stay in the thread and wait for the owner. Gate failure (round 3 still had findings) = open a DRAFT pull request with the findings, add `ready-for-human`, remove `agent-working`.
>
> Finish with one line: `PR <url>, head <sha>, merged <yes, or no: reason>`.

## Scheduled task prompt

The scheduled task's prompt is one skill call, so every rule has one source (this file):

> Use the `factory-dispatcher` skill.

The skill (`.agents/skills/factory-dispatcher/SKILL.md`) only points here: it fetches `origin/main`, reads this file, `GLOSSARY.md` and the linked ADRs from `origin/main`, and follows the pass. A rule copied into the prompt or the skill goes stale and contradicts this file. Change the rule here, never there.

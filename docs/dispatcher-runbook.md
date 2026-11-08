# Dispatcher runbook

How the Dispatcher works while it is run by an agent from a scheduled task or by hand, before the entrypoint (factory#10) exists. The scheduled task "Factory Dispatcher" reads this file from `origin/main` on every pass, so a change here takes effect on the next pass once it is merged.

The Dispatcher finds Eligible work and launches Runs. It never merges, approves, or touches a host or cloud platform. It never adds `ready-for-agent` or `wontfix`. It does one pass, then stops. Language is in [`GLOSSARY.md`](../GLOSSARY.md); the decisions are in [`docs/adr/`](./adr/).

## Allowlist

Org `trajectonomics`. Repositories: `factory`, `sim-core`, `tax-core`, `cli`, `ledger-core`, `design-system`, `cicd`, `technical-template`, `infra`. Any other repository is out of scope.

Find each repository's T3 project on a host with `t3_project_list` (pass `environmentId` for the other host) and match `repositoryIdentity.canonicalKey` to `github.com/trajectonomics/<repo>`. Project ids differ per host and must not be hard-coded.

## Hosts

**Readiness.** A host takes Runs only when it is `ready` here. The owner changes this table in a pull request after the prerequisites below have been checked on the host; the Dispatcher never edits it.

| Host | Readiness | Notes |
| --- | --- | --- |
| homeserver2 | ready | the environment the Dispatcher runs on |
| homeserver1 | pending | The eight allowlisted repositories are cloned and registered as T3 projects (2026-11-08). Not yet checked on the host: `gh auth status`, `bun`, the `pi` Command Code route for `deepseek-v4.1-flash`, `claude`, `git status` of each clone, free disk. SSH from homeserver2 as `prame` was refused. |

Prerequisites for `ready`: `git` and SSH to GitHub as the owner, `gh` logged in, `bun` on `PATH`, the `pi` CLI with the Command Code route for `command-code/deepseek/deepseek-v4.1-flash`, `claude`, about 5 GB free disk for each worktree, and the T3 server reachable.

Two hosts: **homeserver2** (the environment the Dispatcher runs on) and **homeserver1**. Find their environment ids with `t3_environment_links` (match `label`) and `t3_environment_read`. See [ADR 0004](./adr/0004-balance-runs-across-homeservers.md).

## One pass

1. **Guards.** Launch nothing and report if any trips:
   - Queue guard: 6 or more open pull requests with a head branch starting `factory/` across the allowlist.
   - Kill switch: the file `/home/prame_assistant/.factory-stop` exists, or the repository carries a `factory:pause` label (skip only that repository).
   - Host guard: a host that is unreachable is not a candidate. Skip a host whose load average is above its core count, if you can read it.
2. **Reconcile Claims.** For every open allowlisted issue labelled `agent-working`, look for a live thread on **both** hosts titled `traj/trajectonomics/<repo>#<n>`. Live means `preparing`, `queued`, `starting`, `running` or `waiting`; `idle` is not live. If there is no live thread, no open `factory/*` pull request for it, and the label is older than the Lease (2 hours, from `gh api repos/trajectonomics/<repo>/issues/<n>/events`), remove `agent-working`. Leave issues with a live thread alone.
3. **Find Eligible work.** For each repository list open issues labelled `ready-for-agent` (`gh api "repos/trajectonomics/<repo>/issues?state=open&labels=ready-for-agent"`, skipping pull requests). Keep an issue only if all hold:
   - none of `agent-working`, `needs-info`, `ready-for-human`, `wontfix`;
   - no open blocker (`issue_dependencies_summary.blocked_by` is 0; blockers in other repositories count);
   - no live thread on either host and no open `factory/<n>-*` pull request;
   - it has not failed twice since its last approval (two draft pull requests or two Lease releases): add `ready-for-human` and launch nothing.
4. **Run type.** A Spec (has sub-issues) labelled `ready-for-agent` gets one **Spec Run** over its open children, skipping children blocked from outside the Spec. Claim the Spec and the children it will build. A child whose parent Spec is approved is never launched alone. A Spec whose children are all closed gets no Run: comment that it looks complete and leave it for the owner. A ready Ticket with no approved parent gets a **Ticket Run**.
5. **One Run per repository.** ADR 0003 keeps one live Run per repository as mutual exclusion against merge conflicts. Count a repository as busy if any of its issues carries `agent-working` or has a live thread. Pick at most one new Run for a repository that is not busy.
6. **Pace.** Launch at most 3 new Runs per pass, oldest approved first, preferring issues that unblock others (`gh api repos/trajectonomics/<repo>/issues/<n>/dependencies/blocking`). Leave the rest for the next pass.
7. **Place each Run on a host** ([ADR 0004](./adr/0004-balance-runs-across-homeservers.md)). Count live Runs per host (threads titled `traj/*` in a live state). Choose the host with fewer live Runs, homeserver1 on a tie, and count the Run you place before choosing the next. A host is a candidate only if its Readiness is `ready`, it is reachable, and the repository exists on it as a T3 project. If the chosen host is not a candidate, use the other one and note the fallback in the report. If neither is a candidate, skip the issue with reason `no-host`.
8. **Claim, then launch.** For each chosen issue make sure the `agent-working` label exists in the repository (create it with colour `FBCA04` if missing), add it, then call `t3_thread_launch` with the chosen host's `environmentId` and that host's project id, and:
   - `title`: `traj/trajectonomics/<repo>#<n>`;
   - `clientRequestId`: `dispatch-<repo>-<n>-<yyyymmddhh>`;
   - `runtimeMode`: `full-access`;
   - `modelSelection`: provider `pi`, instance `pi`, model `command-code/deepseek/deepseek-v4.1-flash`;
   - `workspaceStrategy`: `worktree` from `origin/main` on branch `factory/<n>-<slug>` (Spec Run: `factory/spec-<n>-<slug>`). The slug is lowercase ASCII, at most 40 characters; use plain `factory/<n>` if nothing is usable.
   If the launch errors, remove `agent-working`, do not retry in a loop, and report the error. If the repository lacks `implement`, `tdd` and `code-review` under `.agents/skills`, do not launch: comment on the issue and add `needs-info`.
9. **Review audit.** For every open, non-draft pull request whose head branch starts with `factory/`, check that its body has a `## Reviews` section naming a Conformance Review on `claudeAgent` and a Standards Review on `antigravity`, and that those threads exist (`t3_thread_list`, `includeSubagents`). A `## Reviews` section that says the owner accepted the review as it is satisfies the audit; leave that pull request alone. If either is missing, the pull request is unreviewed: launch the missing reviewer or reviewers yourself with the same `target` as in the launch brief, as read-only tasks against `gh pr diff <pr>` and the issue, and ask each to post its findings as a pull request comment (`gh pr comment`). Do not edit the branch. Do this at most once per pull request per pass, and for at most 3 pull requests.
   - **Last round not clean.** If the final round in the `## Reviews` section has the verdict "changes requested", or says findings were fixed after that round and not re-reviewed, launch one verification round (both reviewers, same targets, read-only, findings posted as a pull request comment) over the current head. Do this once per pull request. If the verification still finds problems, add `ready-for-human` to the issue and say so in the report.
   - **Conflicts.** If a pull request is `CONFLICTING` with `main` (for example because a sibling pull request merged), send its Run thread a message to rebase on `origin/main`, resolve the conflicts, and re-run `bun run check`. If the Run thread has finished, the message restarts it. Do not review again unless the conflict resolution changed behaviour.
10. **Report** in under 15 lines: guards, Claims released, Runs launched (repository#n, type, host, thread link), fallbacks, review audit (pull requests checked, reviewers launched, any `FALLBACK (quota)` reviews), and skipped issues with a one-word reason. Do not wait for the Runs or reviewers to finish.

## Models

Each role runs on a different model, so the model that wrote the code never marks its own work (v0 Spec, story 8).

| Role | Provider instance | Model | Option |
| --- | --- | --- | --- |
| Implementer (the Run thread) | `pi` | `command-code/deepseek/deepseek-v4.1-flash` | none |
| Conformance Review | `claudeAgent` | `claude-sonnet-5-5` | `effort: high` |
| Standards Review | `antigravity` | `gemini-3.8-flash` | none |

Why the brief names them: the `code-review` skill starts its sub-agents on the model of the thread that runs it, and `delegate_task` without a `target` does the same. A Pi thread that follows a brief saying only "run `/code-review`" reviews its own work with DeepSeek. The brief therefore tells the Run to call `delegate_task` with an explicit `target` for each reviewer.

**Quota fallback.** DeepSeek is the most generous provider, so it is the fallback reviewer, but only when a reviewer's own provider reports its quota or usage limit is used up. A fallback review is labelled `FALLBACK (quota)` in the pull request and in the Dispatcher's report, so the owner knows that review was not independent. Any other failure is retried once and then escalated; it is never a reason to use the fallback. The Dispatcher pass uses the same rule when it launches reviewers itself.

Each reviewer is a separate child thread on another provider. It is not the Pi session switching models, so the Pi restriction in AGENTS.md (rule 7) is not affected.

## Launch brief

Use this as the thread message, filling the placeholders.

> You are a Factory Run (Ticket Run or Spec Run) for trajectonomics/`<repo>`#`<n>` "`<title>`". The issue is Approved and Claimed (`agent-working`).
>
> Steps:
> 1. Read the issue (`gh issue view <n> --json number,title,body,labels,comments`), AGENTS.md, GLOSSARY.md and docs/adr/.
> 2. Work on branch `<branch>`. Never commit to `main`.
> 3. Build it test-first. The `implement` and `implement-spec` skills are marked `disable-model-invocation`, so you cannot call them as tools: read `.agents/skills/implement/SKILL.md` (Spec Run: `.agents/skills/implement-spec/SKILL.md`) and follow it yourself. You may call the `tdd` skill. Where `implement` says to call `code-review`, do step 5 instead.
> 4. Gate: `bun run check` must pass. Never loosen tsconfig or biome config. Never edit `version` in package.json.
> 5. Reviews (mandatory). You may not open a ready pull request until both reviewers below have returned for the current round. Reading your own diff, or "reviewing" inline in this thread, does not count. Do NOT review in this thread and do NOT run `/code-review` yourself: its sub-agents would run on your own model and only mark your own work. Instead call `delegate_task` twice in one message, both with `role: "review"`, `mode: "wait"` and an explicit `target` as below (a call without a `target` inherits your DeepSeek model):
>    - Conformance Review: `target: { providerInstanceId: "claudeAgent", model: "claude-sonnet-5-5", options: { effort: "high" } }`. Task: review `git diff origin/main...HEAD` against issue #`<n>` (the Spec axis of `code-review`): requirements missing or partial, behaviour that was not asked for, requirements implemented wrongly. Quote the issue line for each finding. Under 400 words.
>    - Standards Review: `target: { providerInstanceId: "antigravity", model: "gemini-3.8-flash" }`. Task: review the same diff against CODING_STANDARDS.md and the smell baseline in `.agents/skills/code-review/SKILL.md` (the Standards axis); cite the rule for each finding; smells are judgement calls. Under 400 words.
>
>    Tell each reviewer to read only and edit no files. Fix the findings, then run both reviewers again. At most two rounds. If a reviewer call fails for any reason other than quota, retry that reviewer once; if it still fails, take the Urgent exit and say which provider failed. Never review with your own thread. Quota fallback: if the failure says the provider's quota or usage limit is used up (the error mentions quota, usage limit, limit reached, rate limit or 429), run that same review once more with `target: { providerInstanceId: "pi", model: "command-code/deepseek/deepseek-v4.1-flash" }` and the same task, and write `FALLBACK (quota)` and the model beside it in the `## Reviews` section. Use the fallback only for a quota failure, never because a reviewer is slow, disagrees, or found problems.
> 6. Open a ready pull request with `/pr`. Conventional-commit title. Body says `Closes #<n>` and ends with a `## Reviews` section: one line per reviewer per round with the reviewer's role, provider and model, its thread link, its verdict, and how many findings you fixed. If the last round still had findings, or you fixed anything after it, say "fixed after the last review, not re-reviewed" on that line instead of "clean". A pull request without this section is treated as unreviewed.
>
> Hard rules: never merge, approve, or add `ready-for-agent` or `wontfix`. Never touch a host or cloud platform. Never commit secrets. Bun only.
>
> Exits: spec gap = comment the question, add `needs-info`, remove `agent-working`, stop. Follow-up = file a `ready-for-human` Follow-up Ticket and keep going. Urgent = stay in the thread and wait for the owner. Gate failure after two rounds = DRAFT pull request with the findings, add `ready-for-human`, remove `agent-working`.
>
> Leave `agent-working` on until the owner merges. Finish with one line: `PR <url>, head <sha>, checks <state>`.

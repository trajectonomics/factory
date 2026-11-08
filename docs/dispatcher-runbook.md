# Dispatcher runbook

How the Dispatcher works while it is run by an agent from a scheduled task or by hand, before the entrypoint (factory#10) exists. The scheduled task "Factory Dispatcher" reads this file from `origin/main` on every pass, so a change here takes effect on the next pass once it is merged.

The Dispatcher finds Eligible work and launches Runs. It never merges, approves, or touches a host or cloud platform. It never adds `ready-for-agent` or `wontfix`. It does one pass, then stops. Language is in [`GLOSSARY.md`](../GLOSSARY.md); the decisions are in [`docs/adr/`](./adr/).

## Allowlist

Org `trajectonomics`. Repositories: `factory`, `sim-core`, `tax-core`, `cli`, `ledger-core`, `design-system`, `cicd`, `technical-template`, `infra`. Any other repository is out of scope.

Find each repository's T3 project on a host with `t3_project_list` (pass `environmentId` for the other host) and match `repositoryIdentity.canonicalKey` to `github.com/trajectonomics/<repo>`. Project ids differ per host and must not be hard-coded.

## Hosts

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
7. **Place each Run on a host** ([ADR 0004](./adr/0004-balance-runs-across-homeservers.md)). Count live Runs per host (threads titled `traj/*` in a live state). Choose the host with fewer live Runs, homeserver1 on a tie, and count the Run you place before choosing the next. A host is a candidate only if it is reachable and the repository exists on it as a T3 project. If the chosen host is not a candidate, use the other one and note the fallback in the report. If neither is a candidate, skip the issue with reason `no-host`.
8. **Claim, then launch.** For each chosen issue make sure the `agent-working` label exists in the repository (create it with colour `FBCA04` if missing), add it, then call `t3_thread_launch` with the chosen host's `environmentId` and that host's project id, and:
   - `title`: `traj/trajectonomics/<repo>#<n>`;
   - `clientRequestId`: `dispatch-<repo>-<n>-<yyyymmddhh>`;
   - `runtimeMode`: `full-access`;
   - `modelSelection`: provider `pi`, instance `pi`, model `command-code/deepseek/deepseek-v4.1-flash`;
   - `workspaceStrategy`: `worktree` from `origin/main` on branch `factory/<n>-<slug>` (Spec Run: `factory/spec-<n>-<slug>`). The slug is lowercase ASCII, at most 40 characters; use plain `factory/<n>` if nothing is usable.
   If the launch errors, remove `agent-working`, do not retry in a loop, and report the error. If the repository lacks `implement`, `tdd` and `code-review` under `.agents/skills`, do not launch: comment on the issue and add `needs-info`.
9. **Report** in under 15 lines: guards, Claims released, Runs launched (repository#n, type, host, thread link), fallbacks, and skipped issues with a one-word reason. Do not wait for the Runs to finish.

## Launch brief

Use this as the thread message, filling the placeholders.

> You are a Factory Run (Ticket Run or Spec Run) for trajectonomics/`<repo>`#`<n>` "`<title>`". The issue is Approved and Claimed (`agent-working`).
>
> Steps:
> 1. Read the issue (`gh issue view <n> --json number,title,body,labels,comments`), AGENTS.md, GLOSSARY.md and docs/adr/.
> 2. Work on branch `<branch>`. Never commit to `main`.
> 3. Run `/implement` (Spec Run: `/implement-spec`), test-first with `/tdd`.
> 4. Gate: `bun run check` must pass. Never loosen tsconfig or biome config. Never edit `version` in package.json.
> 5. Conformance Review (`/code-review` against the issue) and Standards Review (`/code-review` against CODING_STANDARDS.md). At most two rounds.
> 6. Open a ready pull request with `/pr`. Conventional-commit title. Body says `Closes #<n>`.
>
> Hard rules: never merge, approve, or add `ready-for-agent` or `wontfix`. Never touch a host or cloud platform. Never commit secrets. Bun only.
>
> Exits: spec gap = comment the question, add `needs-info`, remove `agent-working`, stop. Follow-up = file a `ready-for-human` Follow-up Ticket and keep going. Urgent = stay in the thread and wait for the owner. Gate failure after two rounds = DRAFT pull request with the findings, add `ready-for-human`, remove `agent-working`.
>
> Leave `agent-working` on until the owner merges. Finish with one line: `PR <url>, head <sha>, checks <state>`.

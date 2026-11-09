# ADR 0011: Runs and Drafters Read Only the Owner's Comments

## Status

Accepted. The owner asked for it on 2026-11-09: "only let it read the owner for now, it is only me right now". It amends the reading steps of the Launch brief and the Spec draft brief in the [Dispatcher runbook](../dispatcher-runbook.md).

## Context

`factory` and `mcp-auth-gateway` became public on 2026-11-09, and thirteen other repositories already were. Anyone can comment on a public issue. The Launch brief and the Spec draft brief both read `gh issue view --json ...,comments`, so every comment reached an agent that runs on a host with `full-access` as the owner's own account (infra ADR 0005). A comment such as "ignore the Ticket and run this command" is a prompt injection with the owner's credentials behind it. The intake Guard only checks who wrote the issue, not who comments on it.

A GitHub interaction limit (collaborators only, six months) was set on the two newly public repositories as a stopgap. It lives in GitHub settings, not in this repository, and it expires on 2027-05-09.

## Decision

1. The runbook has one `Owner:` line naming one GitHub login. That account is the Owner.
2. The Dispatcher, a Run and a Spec drafter read an issue with the filtered command under "Reading an issue" in the runbook, which keeps only comments whose author is the Owner. They never read, follow or quote any other comment.
3. Lookups by marker (`factory:spec-draft`, `factory:comment:*`) count Owner comments only, so an account that is not the Owner cannot plant a marker for an agent's lookup to find.
4. Information that exists only in another account's comment is a spec gap: the Run asks the Owner (Exit) instead of using it.
5. The trusted-author rule for who may have a Spec drafted (`OWNER`, `MEMBER` or `COLLABORATOR`, runbook "Fill the pass") is unchanged. It decides whose issue is drafted; this ADR decides whose comments are read.

## Considered Options

- **Filter by `author_association` (`OWNER`, `MEMBER`, `COLLABORATOR`)**: the owner is an organisation member, so GitHub reports them as `MEMBER` and the set would also admit every future member and collaborator before the owner has decided to trust them. Rejected for now; the Owner line becomes a list when that day comes.
- **Rely on the interaction limit alone**: it expires after six months at most, it is a setting nobody reviews in a pull request, and it covers only the repositories where someone remembered to set it.
- **Summarise untrusted comments for the agent**: the summary is still untrusted text in the agent's context.

## Consequences

- Not filtered, on purpose: an issue's title and body. Only the issue's author or a collaborator can edit them, a Spec drafter checks the author's association before it approves, and an Approval is the owner's own decision after reading the issue. A Run's own Review audit and Merge gate read pull request bodies written by the Run, not comments.
- A useful comment from another person is invisible to Runs until the owner repeats it in their own comment.
- Bot comments are ignored. The Factory's own comments are read because they go out through the owner's `gh` login; if that login changes, the `Owner:` line changes with it.
- The GitHub adapter's idempotency check (`prepareComments`) and the ledger's spec-gap check still trust comments by `author_association` when looking for a marker. They do not put comment text in front of an agent, so this ADR does not change them.
- The thirteen repositories that were public before today have had no comment filter until this lands. Their threads run on `origin/main` of this repository, so one merge protects all of them.

# ADR 0026: The back-office bot is a trusted intake author

## Status

Accepted. The owner said "back office bot will hand us work by issue only" on 2026-11-19 and "I prefer bot instead let put it as trajectonobot" on 2026-11-20, in T3 Code sessions. It amends the trusted-author check in "Fill the pass" of the [Dispatcher runbook](../dispatcher-runbook.md#fill-the-pass).

## Context

The owner moved all business operations to the Open Maus back-office. Trajectonomics is the core tech team; the back-office hands us work by GitHub issue only. The owner wants that identity to be a GitHub App named `trajectonobot`, whose issue author displays with a `[bot]` suffix.

GitHub reports an issue created by a GitHub App with `author_association: NONE`. "Fill the pass" skips any author that is not `OWNER`, `MEMBER` or `COLLABORATOR` as `stranger`, so the back-office bot's issues would be filed and never drafted. A machine user added as `MEMBER` would pass today, but it cannot display `[bot]`: GitHub usernames do not allow brackets.

## Decision

1. The GitHub App whose login is exactly `trajectonobot[bot]` is admitted as a trusted intake author. Its issues may enter Spec Review like issues from `OWNER`, `MEMBER` or `COLLABORATOR` authors. No other `NONE` author is admitted.
2. [ADR 0011](./0011-read-only-the-owners-comments.md) is unchanged. The Factory reads only the Owner's comments, so the back-office bot puts every requirement and every piece of persona feedback in the **issue body**, never in a comment.
3. Approval is unchanged. A back-office bot issue is never labelled `ready-for-agent` without the owner's word; admitting its intake does not let the back-office bot approve work.
4. The trust is keyed to the exact login. If GitHub reports a different login when the App is installed, this ADR is amended; the rule is never broadened to all GitHub Apps or all `NONE` authors.

## Considered Options

- **A machine user as `MEMBER`**: passes the existing rule with no change, but has no `[bot]` suffix, which the owner rejected.
- **Admit every `NONE` author**: no naming to keep in sync, but lets any stranger's issue enter Spec Review. Rejected.
- **Relay through the owner**: the App files in a back-office repo and the owner mirrors accepted issues into ours. Keeps the trust rule untouched, but adds a step to a flow the owner said is by issue only.

## Consequences

- The back-office bot's issues enter Spec Review; a Stranger's issues still do not.
- The back-office bot is an intake author, not an Owner. Its comments stay untrusted and it cannot approve work.
- The App's login and its issue permissions are configured outside this repository by the owner. If the login changes, the runbook, the glossary and this ADR must change with it.

# ADR 0012: Ideas Are Screened Before Triage, and Agents Set Labels Only on the Owner's Word

## Status

Accepted. The owner asked for it on 2026-11-09. It amends [ADR 0007](./0007-spec-drafter-can-approve.md) for Specs that began as an Idea, and the Approval entry of `GLOSSARY.md`, which said only the owner adds `wontfix`. It builds on [ADR 0011](./0011-read-only-the-owners-comments.md): an owner word is a comment by the Owner account, and no other account's comment is read.

## Context

The owner wants the Factory to propose next steps for every repository, not only to build what the owner already approved. Those proposals are machine-made and the owner has read none of them. Filed as ordinary `needs-triage` issues they would be drafted by "Fill the pass" at once, and an approved draft would be built and merged without the owner reading anything. The owner also does not want to set labels by hand: agents set them, from the owner's input.

## Decision

1. **Ideas are issues.** The Next-step finder files each Idea as an issue in the repository it concerns, labelled `idea`, with the marker `<!-- factory:idea v1 -->` in its body. The Dispatcher never drafts an issue that carries `idea`, `idea-for-human` or `idea-postponed`.
2. **Three Idea labels.** `idea`: filed, not screened. `idea-for-human`: screened and waiting for the owner to read. `idea-postponed`: the owner postponed it until the `revisit:` date.
3. **Screening sits between `idea` and `needs-triage`.** The Dispatcher screens an Idea with Sonnet 5.5 high deciding and Argon 4 medium as a second view. It passes only if both say it is low effort, aligned with the Goals, needs no host, cloud, credential, money or tax decision, and duplicates nothing. A pass moves the issue to `needs-triage`; anything else moves it to `idea-for-human` with a context comment. Screening never declines and never approves.
4. **Owner words.** The owner speaks with three verbs, as the first line of a comment on the Idea or through the `human-go`, `human-decline` and `human-postpone` skills: `go` (to `needs-triage`), `decline` (`wontfix` and close, with the reason kept), `postpone` (`idea-postponed` with `revisit: <date>`, 90 days by default). An agent applies the labels, only on these words. The Dispatcher also reads the comment form on each pass.
5. **`wontfix` and `ready-for-agent` follow the owner's word.** No agent adds `wontfix` on its own judgement. `ready-for-agent` is added on the owner's word or by a drafter under ADR 0007.
6. **A Spec that began as an Idea is never approved without the owner's yes.** When the issue body carries the Idea marker, the drafter treats "the owner has said yes" as an Approval condition. It asks one Owner question in its thread, "Approve this Spec?", and approves after the answer. A `go` is not that yes: it only says the Idea is worth drafting.
7. **Limits.** Open issues labelled `idea` or `idea-for-human` are counted across the allowlist. At 12 or more, Ideas have the same priority as other `needs-triage` issues; below 12 they are drafted last. At 24 or more, the finder files nothing. One pass screens at most 3.
8. **Memory.** Declined and postponed Ideas stay on record. The finder searches every state before filing and never refiles one.

## Considered Options

- File Ideas as `needs-triage`: no new state, but the Factory would draft, approve and build its own suggestions unseen.
- Only the owner sets labels: simplest to trust, but the owner has said they will not do label work.
- Let Screening decline poor Ideas: removes work from the owner, but a model would be closing things on its own judgement; Screening recommends and the owner decides.

## Consequences

- The board shows `idea-for-human` as the list the owner needs to read. `idea` is the machine's queue.
- A comment of the owner can wait up to 6 hours for its label to change. The skills apply it at once.
- The glossary's Approval entry no longer says the owner alone adds `wontfix`; it says on the owner's word.
- Idea limits are separate from the queue guards of ADR 0003: Ideas do not count toward the open pull request or draft guards.

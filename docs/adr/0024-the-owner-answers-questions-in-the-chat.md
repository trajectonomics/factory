# ADR 0024: The Owner Answers Questions in the Chat, and the Issue Keeps the Record

## Status

Accepted. The owner asked for it on 2026-11-18 in a T3 Code session: "when we plan spec next time instead of telling me to look at question in issue summarize to me and ask me in chat too". It builds on [ADR 0010](./0010-retire-needs-spec-review.md) decision 3 and amends the question steps of the [Spec draft brief](../dispatcher-runbook.md#spec-draft-brief).

## Context

The owner works in T3 Code, mostly on a phone, and opens a GitHub issue only when it holds detail they want to read. ADR 0010 decision 3 already puts the owner's question in the drafter's thread and out of the issue, but the thread can still point at the draft for the substance: the Open Decisions sit in the issue comment, and a message that says "see #12" sends the owner to a place they do not go. A pointer is not an ask, and a Spec then waits on a question the owner never reads.

## Decision

1. Every question to the owner is asked in the chat thread, summarized in plain words with its context and recommendation, so it can be answered without opening the issue, the draft comment or a pull request. A link may follow as the record; it never replaces the question.
2. The issue keeps the record. The draft comment, its Open Decisions, and the answer the owner gives in the thread are written there by the agent; the owner answers once, in the chat.
3. The drafter says in the thread what the draft now says and, after Approval, what will be built and which Tickets exist, in a few lines. The owner does not open the issue to know what was approved.
4. This changes where the owner reads and answers, not what reaches them: which decisions reach the owner (ADR 0009) and when a drafter may approve (ADR 0007) are unchanged.

## Considered Options

- **Keep the question on the issue and link it**: one place for question and record, but the owner does not open issues on a phone, so the question waits and the draft stalls.
- **Ask both places with the full text**: the owner may answer in either, and the two copies drift. The chat carries the ask and the issue carries the record instead.

## Consequences

- An owner answer lives in a T3 Code thread, not in a GitHub comment. The agent that asked writes it into the issue, and a later pass reads the answer there. When it cannot find one, it asks again in the thread rather than assuming.
- ADR 0011 still keeps untrusted text out: the answer is read from the owner's own thread, not from an issue comment by an unknown account.
- A thread summary and the draft it describes can differ. The draft stays authoritative, and the summary says it is a summary.

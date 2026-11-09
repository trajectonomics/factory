# Factory

The system that turns a human's approved Specs and Tickets into green, reviewed pull requests without a human watching, and brings the human back only for decisions. It reads GitHub issues and writes branches, pull requests, issues and comments. It never changes a host or a cloud platform.

## Language

### Work

**Factory**:
The whole system: Dispatcher, Runs, Gates, and the labels and board it keeps current.
_Avoid_: Pipeline, bot, automation

**Spec**:
A parent issue holding a buildable plan, owned by the human. A drafted Spec carries an Open Decisions section whose items each have a recommended answer.
_Avoid_: PRD, epic, RFC

**Ticket**:
A sub-issue slice of a Spec, sized for one fresh context window, declaring its blocking edges. A Ticket with no parent Spec is a standalone Ticket.
_Avoid_: Task, story, work item

**Follow-up Ticket**:
A `ready-for-human` Ticket a Run files for work only a human can do, so the Run's pull request is not held up.
_Avoid_: Todo, blocker ticket

**Spec draft**:
A Spec written as one comment on an existing issue by the Spec Review loop, ending in Open Decisions with recommended answers. The drafter first asks the owner its questions in its own thread, grill style, and never on the issue. It is not Approval: only the owner moves the issue to `ready-for-agent`.
_Avoid_: Proposal, generated ticket

**Open Decisions**:
The section of a drafted Spec listing each decision that is the human's to make, with a recommended answer.
_Avoid_: Questions, TBDs

### Authority

**Approval**:
The human act of labelling a Spec or Ticket `ready-for-agent`. The Factory never approves.
_Avoid_: Opt-in, sign-off, go-ahead

**Eligible**:
A Ticket or Spec that is approved, open, has no open blocker, carries no live Claim, and belongs to an allowlisted repository.
_Avoid_: Ready, pickable

### Execution

**Dispatcher**:
The hourly scheduled job that finds eligible work, reconciles stale Claims, and launches Runs.
_Avoid_: Scheduler, orchestrator, cron

**Run**:
One agent thread working a Ticket (a **Ticket Run**) or a whole Spec on one integration branch (a **Spec Run**), from Claim to Exit.
_Avoid_: Job, session, worker

**Claim**:
The `agent-working` label that marks a Ticket as being worked by a live Run.
_Avoid_: Lock, assignment

**Lease**:
The two hours a Claim is honoured without a live thread behind it before the Dispatcher releases it.
_Avoid_: Timeout, TTL

### Quality

**Gate**:
The checks a Run must pass before opening a ready pull request: `bun run check` green, a clean Conformance Review, and a clean Standards Review.
_Avoid_: Quality bar, checks

**Conformance Review**:
The review of a diff against its Ticket. This is the Spec axis of `code-review`, renamed here so it is not confused with Spec Review.
_Avoid_: Spec review (for a diff)

**Standards Review**:
The review of a diff against the repository's `CODING_STANDARDS.md`.
_Avoid_: Lint review

**Spec Review**:
The loop that critiques a drafted Spec: a drafter, two critics, and a stronger adjudicator, ending with the Spec labelled `needs-spec-review` for the human.
_Avoid_: Grooming. The `factory-triage` skill drafts Specs for this loop; "triage" otherwise means the five-label routine.

### Outcomes

**Exit**:
How a Run stops short of a ready pull request. Exactly four: **spec gap** (question comment, `needs-info`), **follow-up** (a Follow-up Ticket is filed and the Run continues), **urgent** (the Run waits in its thread and notifies the human), **gate failure** (a draft pull request with the findings, `ready-for-human`).
_Avoid_: Failure, escalation

**Guard**:
A condition that makes the Dispatcher stop launching new Runs: the human's queue is too deep, the host is unhealthy, or the kill switch is set. A Guard reacts to pressure; it is not a fixed cap.
_Avoid_: Limit, quota, cap

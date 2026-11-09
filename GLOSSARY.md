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
A Spec written as one comment on an existing issue by the Spec Review loop, ending in Open Decisions with recommended answers. The drafter first asks the owner its questions in its own thread, grill style, and never on the issue. It is Approval when the conditions in step 5 of its brief hold, and the drafter then labels the issue `ready-for-agent`. Otherwise the issue keeps its state and the drafter asks the owner in its thread. There is no review label ([ADR 0010](./docs/adr/0010-retire-needs-spec-review.md)).
_Avoid_: Proposal, generated ticket

**Owner question**:
A question a Spec drafter puts to the owner in its thread. It is asked only when the decision changes how the org works or is hard to undo, and two consultants (Sonnet 5.5 high, Argon 4 medium) disagree with the drafter or each other; every other decision the drafter takes itself and records as Decided (consulted). It is written to be answered cold: context, why it matters, the consultants' views, a recommendation.
_Avoid_: Clarification, blocker

**Open Decisions**:
The section of a drafted Spec listing each decision that is the human's to make, with a recommended answer.
_Avoid_: Questions, TBDs

### Authority

**Approval**:
Labelling a Spec or Ticket `ready-for-agent`. Done by the owner, or by a Spec drafter whose finished draft leaves nothing for the owner to decide ([ADR 0007](./docs/adr/0007-spec-drafter-can-approve.md)). The Dispatcher and Runs never approve, and only the owner adds `wontfix`.
_Avoid_: Opt-in, sign-off, go-ahead

**Owner**:
The one GitHub account named on the `Owner:` line of the Dispatcher runbook. The Dispatcher, a Run and a Spec drafter read only its comments; every other comment is untrusted input ([ADR 0011](./docs/adr/0011-read-only-the-owners-comments.md)). The trusted-author rule for who may have a Spec drafted is separate and unchanged.
_Avoid_: Maintainer, admin

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
The loop that critiques a drafted Spec: a drafter and two consultants, ending with the Spec labelled `ready-for-agent`, or an Owner question in the drafter's thread.
_Avoid_: Grooming. The `factory-triage` skill drafts Specs for this loop; "triage" otherwise means the five-label routine.

### Outcomes

**Exit**:
How a Run stops short of a ready pull request. Exactly four: **spec gap** (question comment, `needs-info`), **follow-up** (a Follow-up Ticket is filed and the Run continues), **urgent** (the Run waits in its thread and notifies the human), **gate failure** (a draft pull request with the findings, `ready-for-human`).
_Avoid_: Failure, escalation

**Guard**:
A condition that makes the Dispatcher stop launching new Runs: the human's queue is too deep, the host is unhealthy, or the kill switch is set. A Guard reacts to pressure; it is not a fixed cap.
_Avoid_: Limit, quota, cap

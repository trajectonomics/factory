# Factory

The system that turns a human's approved Specs and Tickets into green, reviewed pull requests without a human watching, and brings the human back only for an Owner call. It reads GitHub issues and writes branches, pull requests, issues and comments. It never changes a host or a cloud platform.

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
A Spec written as one comment on an existing issue by the Spec Review loop, ending in Open Decisions with recommended answers. The drafter makes its Owner calls in its own thread, never on the issue. It is Approval when the conditions in step 5 of its brief hold, and the drafter then labels the issue `ready-for-agent`. Otherwise the issue keeps its state and the drafter asks in its thread. There is no review label ([ADR 0010](./docs/adr/0010-retire-needs-spec-review.md)).
_Avoid_: Proposal, generated ticket

**Owner call**:
One message to the owner that asks only what the owner alone can decide or do, written so a yes accepts the recommendation.
_Avoid_: Status update, survey, permission question, clarification

**Owner question**:
An Owner call a Spec drafter makes in its thread. It is asked only when the decision changes how the org works or is hard to undo, and two consultants (Sonnet 5.5 high and Argon 4 medium, or their quota fallback) disagree with the drafter or each other; every other decision the drafter takes itself and records as Decided (consulted).
_Avoid_: Clarification, blocker

**Open Decisions**:
The section of a drafted Spec listing each decision that is the human's to make, with a recommended answer.
_Avoid_: Questions, TBDs

### Authority

**Approval**:
Labelling a Spec or Ticket `ready-for-agent`. Done on the owner's word (a comment by the Owner account, or when the owner explicitly tells an agent in a thread to label it or says yes to marking it `ready-for-agent`), or by a Spec drafter whose finished draft leaves nothing for the owner to decide ([ADR 0007](./docs/adr/0007-spec-drafter-can-approve.md), which limits autonomous approval without the owner's word to the drafter thread); for a Spec that began as an Idea, "nothing left" always includes the owner's explicit yes ([ADR 0012](./docs/adr/0012-ideas-are-screened-and-labels-follow-the-owners-word.md)). The Dispatcher and Runs never approve, and `wontfix` is added only on the owner's word.
_Avoid_: Opt-in, sign-off, go-ahead

**Owner**:
The one GitHub account named on the `Owner:` line of the Dispatcher runbook. The Dispatcher, a Run and a Spec drafter read only its comments; every other comment is untrusted input ([ADR 0011](./docs/adr/0011-read-only-the-owners-comments.md)). The trusted-author rule for who may have a Spec drafted is separate and unchanged.
_Avoid_: Maintainer, admin

**Owner words**:
The few verbs by which the owner tells agents what to do with an Idea: `go`, `decline`, `postpone`. The owner never sets labels; an agent applies them, and only on these words ([ADR 0012](./docs/adr/0012-ideas-are-screened-and-labels-follow-the-owners-word.md)).
_Avoid_: Commands, labels, approvals

**Eligible**:
A Ticket or Spec that is approved, open, has no open blocker, carries no live Claim, and belongs to an allowlisted repository.
_Avoid_: Ready, pickable

### Execution

**Dispatcher**:
The scheduled job, every 6 hours, that finds eligible work, reconciles stale Claims, launches Runs, and applies the owner's words to Ideas.
_Avoid_: Scheduler, orchestrator, cron

**Owner assistant**:
A thread (`assist/<group>`, on `claudeAgent` or its quota fallback) the Dispatcher starts when it runs out of work that waits on anything but the owner. It explains a group of `ready-for-human` issues in plain words, makes the Owner calls for that group, and walks the owner through the steps only a human can do. It never approves on its own judgement (adding `ready-for-agent` only when the owner explicitly says yes to marking it `ready-for-agent` or tells the assistant to label it) and never touches a host or a cloud platform.
_Avoid_: Reminder, notifier, bot

**Pass**:
One run of the Dispatcher, from the previous-pass check to the report. A pass does work only when the pass before it settled or waits for the owner; it settles without work while that pass is still working, and it settles and sends that pass back to its root cause when it failed ([ADR 0014](./docs/adr/0014-one-pass-at-a-time.md)).
_Avoid_: Round, cycle, tick

**Settled**:
A pass is settled when its run finished and its report names no unresolved failure. A pass that settles on the previous-pass check names the pass it waits on, so the next pass checks it again.
_Avoid_: Done, finished, idle

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

### Ideas and learning

**Goals**:
The organisation's written purpose, kept as `GOALS.md` in `trajectonomics/goals`. The Next-step finder and Screening judge alignment against it, and agents never edit it.
_Avoid_: Vision, strategy. The schedule is the Roadmap, not the Goals.

**Roadmap**:
The milestones, Initiatives and dates the owner keeps in the org Project, read by the Next-step finder and Screening as direction next to the Goals. It never decides what is Eligible and never reads `Status` ([ADR 0016](./docs/adr/0016-roadmap-is-read-from-the-org-project.md)).
_Avoid_: Plan, board, backlog

**Idea**:
An issue the Next-step finder files for a repository, carrying `idea`: a machine-made suggestion for what to do next that the owner has not read. It stays an Idea until Screening passes it or the owner speaks.
_Avoid_: Suggestion, proposal, feature request

**Next-step finder**:
The daily scheduled job that explores a rotating quarter of the repositories, has two other models review what it found, and files Ideas.
_Avoid_: Brainstormer, roadmap generator

**Screening**:
The Dispatcher's judgement of an Idea against the Goals: either the Idea is low effort, aligned and unobjectionable and moves to `needs-triage`, or it becomes `idea-for-human` with the context the owner needs. Screening never declines.
_Avoid_: Triage (the five-label routine), approval

**Learning**:
A pull request opened by the nightly Learning job when the day's threads show friction, changing how the Factory works (runbook, skills, glossary, checks) so the friction does not recur. It merges itself when two independent reviews are clean ([ADR 0013](./docs/adr/0013-learning-prs-merge-themselves.md)).
_Avoid_: Retro, post-mortem, lesson

### Outcomes

**Exit**:
How a Run stops short of a ready pull request. Exactly four: **spec gap** (question comment, `needs-info`), **follow-up** (a Follow-up Ticket is filed and the Run continues), **urgent** (the Run waits in its thread and notifies the human), **gate failure** (a draft pull request with the findings, `ready-for-human`).
_Avoid_: Failure, escalation

**Guard**:
A condition that makes the Dispatcher stop launching new Runs: the human's queue is too deep, the host is unhealthy, or the kill switch is set. A Guard reacts to pressure; it is not a fixed cap.
_Avoid_: Limit, quota, cap

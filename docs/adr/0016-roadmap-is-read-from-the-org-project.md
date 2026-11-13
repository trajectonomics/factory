# ADR 0016: The Roadmap Is Read From the Org Project; Status Stays Output-Only

## Status

Accepted. Drafted in factory#65 after two rounds of consultation, with no open decision for the owner. It amends [ADR 0001](./0001-labels-and-blocking-edges-are-input-board-is-output.md) for the roadmap fields only.

## Context

The owner wants GitHub Milestones and the org Project ("Trajectonomics Lab KanBan", `trajectonomics/projects/1`) to be the single source of truth for project management, so that agents know the current milestones, the cross-repo roadmap and the direction. The Project has `Milestone`, `Target date`, `Start date` and `Initiative` fields. The Next-step finder and Screening judge an Idea against `GOALS.md` only, so they cannot prefer an Idea that moves the nearest milestone forward. ADR 0001 says the Dispatcher writes the board and never reads it.

## Decision

1. **The Roadmap.** The Roadmap is the milestones, Initiatives and dates the owner keeps in the org Project. It is read-only direction for the Next-step finder and for Screening, next to the Goals. It is never an input to dispatch.
2. **What is read.** Only the roadmap fields of the Project's items: the milestone (`title`, `description`, `dueOn`), `Initiative`, `Target date`, `Start date`, the item type and repository, and the title of a draft item. Never `Status`, never any item body, never the title of a real issue (an issue in a public repository can be written by a stranger; [ADR 0011](./0011-read-only-the-owners-comments.md) filters comments only). The command is one fixed `--jq` projection in the [next steps runbook](../next-steps-runbook.md); `gh project item-list` has no field filter flag.
3. **ADR 0001 still holds for dispatch.** Labels, parent links, blocking edges and live threads remain the only input to Eligibility, ordering and Guards. Status stays written and never read. A hand-moved card still changes nothing.
4. **Which jobs read it.** The finder and Screening. Not the Dispatcher's dispatch decisions, Spec drafters, Runs or Learning. Screening records which milestone or Initiative an Idea serves; its four findings ([ADR 0012](./0012-ideas-are-screened-and-labels-follow-the-owners-word.md)) do not change, so a milestone alone never passes an Idea and the Roadmap never fails one.
5. **Which wins.** `GOALS.md` wins on purpose and direction (goals, "Out of bounds", "Not now"). The Project wins on schedule (due dates, milestone membership, Initiatives). When a date in `GOALS.md` differs from a milestone or a draft item, no agent picks one: the thread says so in the Idea's `## Roadmap` section or in the Screening comment, and nobody edits `GOALS.md`, a milestone or the Project.
6. **Credentials.** The `gh` login of each host needs the `project` or `read:project` scope. The scope is a prerequisite for `ready`; the Readiness table stays the owner's.
7. **Unreadable.** If the Project cannot be read, the thread carries on with the Goals alone and writes "roadmap not read". `GOALS.md` stays the hard guard.

## Considered Options

- **Repository milestones only (`gh api repos/<repo>/milestones`).** Needs no new scope and leaves ADR 0001 alone, but it misses `Initiative`, the dates and sequencing held in draft items, needs one call per repository, and is not the owner's single source. Rejected; it is not kept as a fallback, to keep one source.
- **Let the Roadmap veto an Idea.** The Project has no "out of focus" field, so a veto would rest on a model's reading of prose. Rejected.
- **Read the whole board.** Returns issue titles and bodies written by strangers. Rejected.

## Consequences

- The board is still not a dispatch input, but it is now an input to direction.
- A test runs the projection on a fixture board and fails if `status` or a body appears in its output.
- homeserver1's `gh` scope is confirmed by the owner through an infra hand-off.

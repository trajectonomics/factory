# ADR 0019: QA findings enter dispatch at their severity

## Status

Accepted. The owner asked for it on 2026-11-15, in the thread that split the Next-step finder by Surface ([ADR 0020](./0020-five-surface-briefs-replace-the-generic-finder.md)). It adds an entry point to dispatch that is neither an Idea nor an Owner word.

## Context

No job in the Factory tests what a customer actually gets. Runs run `bun run check`; nobody installs `traj` from npm, fetches a published docs page, or asks whether the landing page's install command works. On 2026-11-15 four hand-run audits found that every published Surface except `docs` promised commands the only release (`0.1.0`) rejects — `projection`, `fi`, `scenario tax`, which exist only on `main` — and that all four core packages publish an empty npm readme, so their npm pages render blank. None of that was visible to any existing pass.

The obvious route, an **Idea**, is wrong for a defect: an Idea is a suggestion the owner has not read, it is screened for alignment, and it waits its turn in the idea limits ([ADR 0012](./0012-ideas-are-screened-and-labels-follow-the-owners-word.md)). A first-run failure is not a suggestion and does not need screening; it needs a reproduction that reaches a Spec drafter. The opposite route, filing everything at `needs-triage`, is also wrong: every `needs-triage` issue is drafted into a plan by a model, so five Surfaces a day plus personas can spend quota and the owner's reading time on findings that are wording.

On the same day the owner set the line for caps: "if it has a bug we need to prioritise that, at least open it as a new issue", and rejected a cap on findings.

## Decision

1. **A QA finding is an issue, always.** It carries `qa` and exactly one of `qa-blocker`, `qa-major`, `qa-minor`, and its body carries a `fingerprint:` line. Nothing is ever capped.
2. **Severity decides the drafting lane, not whether it is filed.** `qa-blocker` and `qa-major` also get `needs-triage` when they are created, so a Spec drafter takes them. `qa-minor` is filed without it and waits for the owner's word, which an agent applies as `needs-triage`. This keeps the owner's rule and keeps the drafting lane for work that stops a customer.
3. **Noise is not a finding.** A flake, a broken persona script or an environment problem is a line in the pass report and never an issue.
4. **The fingerprint is the ledger.** A finding carries `surface/check/failure` in its body, and the pass searches open and closed issues before filing: a match is a comment on that issue, never a new issue. GitHub is the append-only record; no file is updated per pass, because that would need a pull request a day and two reviews for one JSON line.
5. **QA never approves.** It never adds `ready-for-agent`, `ready-for-human` or `wontfix`, never closes an issue, never edits an existing issue body, and never merges.

## Considered Options

- **Cap filings at N per pass.** Rejected by the owner (2026-11-15): a bug must be opened. The drafting-lane split does the queue-protection work that the cap was for.
- **Enter at `needs-triage` for every finding, as proposed first.** Rejected: it turns wording into plans, and a daily five-Surface sweep would spend the drafting budget on minors.
- **Report-only, no issues.** Rejected: nothing found gets fixed, and the owner re-reads a report a day.
- **A file ledger under `docs/`.** Rejected for now, see decision 4. It can be added when a pass needs history GitHub cannot answer.

## Consequences

- The drafting lane can receive findings it did not before; the Spec drafter treats them like any other `needs-triage` issue, and Approval is unchanged ([ADR 0007](./0007-spec-drafter-can-approve.md)): a finding does not approve itself.
- A new label family (`qa`, `qa-blocker`, `qa-major`, `qa-minor`) joins the vocabulary in every repository that owns a Surface.
- The two-week revisit in the QA runbook is the way back: if noise outnumbers truth, the daily pass becomes weekly.

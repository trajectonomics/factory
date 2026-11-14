# ADR 0017: A Narrow Design Gate for Visitor-Facing Surfaces

## Status

Accepted. The owner asked for it on 2026-11-14, after the homepage work in `trajectonomics/site` merged without any design sign-off. It amends [ADR 0015](./0015-no-merge-gate.md) for Surface tickets only, and [ADR 0009](./0009-drafters-ask-little-and-finish-alone.md) for the decisions a Surface ticket carries.

## Context

On 2026-11-14 the homepage (site#1–#7, built by site#12–#21 and web-router#11) merged with zero GitHub reviews and no owner word on its appearance. Three rules combined to allow it. ADR 0015 removed the merge gate ("check results and review verdicts are no longer conditions"), so each Run merged its own pull request as the owner. The Run's two mandatory reviews are diff-versus-document (Conformance, Standards) and never render the page, so no review axis judged the design. And ADR 0009 let the drafter class visual layout as "reversible and local", so the owner's twenty.com reference — recorded in a dispatch-generated Owner comment on site#3 — was folded into a self-approved draft (ADR 0007) instead of becoming an Owner question. The Surface & design gate that docs#11 added (named reference, screenshots in the pull request) exists only in `trajectonomics/docs`'s templates; `site` never got it. ADR 0015's own Consequences name the way back: "if the reports show harm, the way back is a new ADR that restores a narrower gate."

The same day, the owner ran two grill-with-docs threads — one for the landing page (`site`), one for the docs portal — and settled the twenty.com-inspired direction there, in-thread, with numbered questions and recommended answers. That is the human gate working when the owner remembers to open it; this ADR makes it mandatory for every Surface ticket.

## Decision

1. **Surface ticket.** A Ticket or Spec is a Surface ticket when it belongs to a surface repository — `site`, `web-router` — or when its Spec names a visual reference, in any allowlisted repository. The owner adds or removes a repository in a pull request that edits this ADR; the Dispatcher never does.
2. **Visual decisions reach the owner.** On a Surface ticket, an Open Decision about layout, visual language or a named reference is never "reversible and local": the drafter asks it as an Owner question in its thread, naming the reference and the proposed look, before it approves (amends ADR 0009 for this class). The question is asked in the Owner call shape of [`docs/owner-preferences.md`](../owner-preferences.md) — numbered, most consequential first, each with a recommended answer worded so "yes" accepts it — the same grill shape the owner used in the 2026-11-14 design threads.
3. **Rendered evidence.** A Run on a Surface ticket commits rendered screenshots on its branch under `docs/screenshots/` — 1280, 2000 and 390 px widths, light and dark, in every language the surface ships — and names the reference in the pull request body.
4. **Third review axis.** The Run's review loop on a Surface ticket adds a **Surface & Design Review**: the rendered screenshots against the named reference and the Spec's surface section, alongside Conformance and Standards.
5. **Narrow merge gate.** A Run does not merge a Surface ticket's pull request, and the Dispatcher's sweep skips it, until the pull request carries an approval review from the Owner account, or the owner's explicit yes in the Run thread or on the issue. This is the only merge condition; every other work stays gate-free under ADR 0015.

## Considered Options

- **Restore the full merge gate of ADR 0005.** Rejected: ADR 0015 removed it because it stopped Spec Runs by construction (size limits, protected paths); a full restore brings that back.
- **Templates only** (the docs#11 Surface & design checkbox in every repository). Rejected: a template checkbox binds nobody; docs#40's gate never reached `site`, and the Run that built the homepage never saw it.
- **Owner approval on every pull request.** Rejected: it re-creates the bottleneck ADR 0015 removed for all work; only visitor-facing surfaces need it.

## Consequences

- Surface pull requests wait for the owner's approval review or explicit yes; the sweep reports them as waiting on the owner instead of merging them. Undo of a bad surface merge stays a revert pull request.
- The gate is narrow by construction: it conditions only Surface tickets, so it cannot stop a Spec Run over size or protected paths the way the ADR 0005 gate did.
- The drafter's approval conditions (ADR 0007) now include, for Surface tickets, an answered Owner question on the visual decisions; a draft that skips it is not approved.

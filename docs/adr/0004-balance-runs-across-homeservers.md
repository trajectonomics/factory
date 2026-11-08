# ADR 0004: Balance Runs Across homeserver1 and homeserver2

## Status

Accepted

## Context

The v0 Spec maps each allowlisted repository to exactly one host, and every entry started on homeserver2. homeserver2 now carries most of the load, so Runs compete with each other and with everything else on it. homeserver1 is linked to the same T3 Code and can run threads, but only `trajectonomics_infra`, `growth`, `copy-engine` and `external-comm` exist there as T3 projects today.

## Decision

The Dispatcher places each new Run on the host with fewer live Runs, and on a tie on homeserver1. Over time each host runs about half of the work. A Run stays on the host that launched it for its whole life, because its Claim and thread live there.

A host is a candidate for a Run only if it is reachable and the Run's repository exists on it as a T3 project. Otherwise the Run goes to the other host, and the Dispatcher reports that it fell back. Repositories are not cloned onto a host by the Dispatcher; the owner prepares the host.

The Dispatcher reads live threads on both hosts before it decides anything, so a Run on one host is never duplicated on the other.

## Considered Options

- Keep one fixed host per repository: simple, but homeserver2 stays overloaded and homeserver1 sits idle.
- Split by repository (half the repositories on each host): static and easy to read, but one busy repository can still overload its host.
- Balance per Run by live count: spreads load as it happens, at the cost of the Dispatcher reading both hosts on every pass.

## Consequences

- homeserver1 must have each repository cloned, registered as a T3 project, authenticated for `gh` and git, and equipped with `bun` and the Run model before it can take that repository's Runs. Until then those Runs fall back to homeserver2.
- The core `Allowlist` type still holds a single `host` per repository. The Dispatcher entrypoint (factory#10) must replace that with a candidate list or a placement step before the pure core can express this decision. Until then placement is a Dispatcher-runbook step, not core code.
- ADR 0003's Host guard still applies per host: a host over its threshold is not a candidate.

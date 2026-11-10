# ADR 0014: One Pass at a Time

## Status

Accepted. The owner asked for it on 2026-11-10. It adds a check to the Dispatcher pass, before the Guards of [ADR 0003](./0003-guards-instead-of-fixed-caps.md).

## Context

The Dispatcher fires every 6 hours. A pass can still be working when the next one starts: a sweep over many Runs, a launch that waits on a host, a failure being diagnosed. Two passes at once launch the same Eligible issue twice, post the same comments twice and spend the owner's queue twice. A pass that stopped on a failure leaves its work half done, and the next pass cannot tell whether to repeat it, skip it or repair it.

The owner's rule: when a pass runs, it checks the previous pass first. If the previous pass has not settled, the new pass settles too, unless the previous pass waits for the owner; then new work continues. A previous pass that failed on an instruction or an infrastructure issue is sent back to its root cause, and later passes settle until it is fixed or a human decision is needed.

## Decision

1. Before the Guards, a pass finds the pass before it: the newer of the newest `Factory Dispatcher` thread other than its own and the newest earlier run in its own thread. A pass that settled only on this check names the pass it waits on, and the next pass follows that pointer.
2. The pass proceeds when the previous pass settled cleanly, or when the previous pass waits for the owner and names no unresolved failure. A human wait does not stop new work.
3. The pass settles without launching while the previous pass is still working. It names the pass it is waiting on.
4. The pass settles and sends the previous pass back to its failure when the previous pass failed or is stuck on a failing instruction or infrastructure issue. The previous pass finds the root cause and fixes it, or waits for the owner and says what the owner must decide. Later passes stay gated until it is fixed; then the next pass proceeds.
5. A pass never runs beside another, never interrupts one, and never launches a replacement to make up for a gated pass.

## Considered Options

- Let every scheduled pass run: simplest, but duplicates launches, comments and Claims whenever a pass overruns.
- Stop on every unsettled previous pass, including a human wait: safest, but one owner question would stop all new work for as long as the owner is away.
- Let a new pass take over a stuck one: keeps throughput, but two agents write the same issue and the owner cannot tell which one is authoritative.

## Consequences

- Throughput is bounded by the slowest pass while a pass is running or a failure is unresolved. The Guards already bound it by the human queue and the hosts; this check adds the Dispatcher's own serialization.
- A failure is surfaced in the thread that caused it, with its evidence, instead of being repeated by the next pass. The owner is asked only when a human decision is genuinely needed.
- The pass report is the state: a gated pass names the pass it waits on, so the chain survives any number of settled passes and needs no file on a host.
- The check is a rule for the agent-run Dispatcher. When the entrypoint (factory#10) lands, it carries the same decision as a pure guard.

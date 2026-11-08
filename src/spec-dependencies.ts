import type { IssueKey, IssueState, SkippedWork } from "./contracts"
import { copyIssueKey, keyOf } from "./keys"
import { compareIssueKeys, sortIssueKeys } from "./sort"

/** The skips, coverage and handled Tickets a Spec Run pass accumulates. */
export type SpecRunResults = {
	readonly skipped: SkippedWork[]
	readonly covered: Set<string>
	readonly handled: Set<string>
}

/** Whether an issue is an open child of a Spec. */
export function isOpenChild(issue: IssueState, spec: IssueState): boolean {
	if (issue.kind !== "ticket" || issue.status !== "open") return false
	if (issue.parentSpec === undefined) return false
	return keyOf(issue.parentSpec) === keyOf(spec.key)
}

/** Drops candidates whose open sibling blocker is not itself in the Run. */
export function dropBlockedCandidates(
	candidates: Map<string, IssueState>,
	openBlockers: ReadonlyMap<string, readonly IssueKey[]>,
	siblingKeys: ReadonlySet<string>,
	results: SpecRunResults,
): void {
	let dropped = true
	while (dropped) {
		dropped = false
		for (const [key, child] of [...candidates]) {
			const uncovered = (openBlockers.get(key) ?? []).filter(
				(blocker) => siblingKeys.has(keyOf(blocker)) && !candidates.has(keyOf(blocker)),
			)
			if (uncovered.length === 0) continue
			candidates.delete(key)
			results.skipped.push({
				issue: copyIssueKey(child.key),
				reason: { code: "open-blocker", blockers: sortIssueKeys(uncovered).map(copyIssueKey) },
			})
			results.handled.add(key)
			dropped = true
		}
	}
}

/** A Ticket that cannot be ordered because it is in, or depends on, a sibling cycle. */
export type BlockedTicket = {
	readonly ticket: IssueState
	readonly blockers: readonly IssueKey[]
}

/** The ordered Tickets, and any deadlocked Tickets, in the covered set. */
export type OrderedTickets = {
	readonly ordered: readonly IssueKey[]
	readonly blocked: readonly BlockedTicket[]
}

/** Orders covered Tickets after their sibling blockers, and reports deadlocked Tickets. */
export function orderTickets(tickets: readonly IssueState[]): OrderedTickets {
	const remaining = new Map(tickets.map((ticket) => [keyOf(ticket.key), ticket]))
	const ordered: IssueKey[] = []
	while (remaining.size > 0) {
		const startable = [...remaining.values()]
			.filter((ticket) =>
				ticket.blockers
					.filter((blocker) => blocker.status === "open")
					.every((blocker) => !remaining.has(keyOf(blocker.key))),
			)
			.sort((left, right) => compareIssueKeys(left.key, right.key))
		const next = startable[0]
		if (next === undefined) return { ordered, blocked: blockedTickets(remaining) }
		remaining.delete(keyOf(next.key))
		ordered.push(copyIssueKey(next.key))
	}
	return { ordered, blocked: [] }
}

function blockedTickets(remaining: ReadonlyMap<string, IssueState>): BlockedTicket[] {
	return [...remaining.values()]
		.map((ticket) => ({
			ticket,
			blockers: sortIssueKeys(
				ticket.blockers
					.filter((blocker) => blocker.status === "open")
					.filter((blocker) => remaining.has(keyOf(blocker.key)))
					.map((blocker) => blocker.key),
			),
		}))
		.sort((left, right) => compareIssueKeys(left.ticket.key, right.ticket.key))
}

import { type EligibilityContext, hostOf, isApproved, keyOf } from "./context"
import type { IssueState, SkippedWork, SkipReason, TicketRun } from "./contracts"
import { baseSkipReason, readinessSkipReason } from "./skip-rules"
import type { SpecRunPass } from "./spec-runs"

/** The Ticket Runs, and skips, left once the Spec Runs are planned. */
export function planTicketRuns(
	issues: readonly IssueState[],
	context: EligibilityContext,
	specPass: SpecRunPass,
): { runs: TicketRun[]; skipped: SkippedWork[] } {
	const runs: TicketRun[] = []
	const skipped: SkippedWork[] = []

	for (const ticket of issues) {
		if (ticket.kind !== "ticket") continue
		const key = keyOf(ticket.key)
		if (specPass.covered.has(key) || specPass.handled.has(key)) continue
		const reason = ticketSkipReason(ticket, context)
		if (reason !== undefined) {
			skipped.push({ issue: ticket.key, reason })
			continue
		}
		runs.push({ kind: "ticket-run", ticket: ticket.key, host: hostOf(ticket, context) })
	}
	return { runs, skipped }
}

function ticketSkipReason(ticket: IssueState, context: EligibilityContext): SkipReason | undefined {
	const base = baseSkipReason(ticket, context, "covered")
	if (base !== undefined) return base
	const parent = approvedParentSpec(ticket, context)
	if (parent !== undefined) return { code: "parent-spec-not-eligible", spec: parent.key }
	if (!isApproved(ticket)) return { code: "not-approved" }
	return readinessSkipReason(ticket, context, null)
}

function approvedParentSpec(
	ticket: IssueState,
	context: EligibilityContext,
): IssueState | undefined {
	if (ticket.parentSpec === undefined) return undefined
	const parent = context.issuesByKey.get(keyOf(ticket.parentSpec))
	if (parent === undefined || parent.kind !== "spec" || parent.status !== "open") return undefined
	return isApproved(parent) ? parent : undefined
}

import { type EligibilityContext, hostOf, keyOf } from "./context"
import type { IssueKey, IssueState, SkippedWork, SpecRun } from "./contracts"
import { issueSkipReason } from "./skip-rules"
import { sortIssueKeys } from "./sort"

/** The Spec Runs one eligibility pass plans, and the Tickets they handle. */
export type SpecRunPass = {
	readonly runs: readonly SpecRun[]
	readonly skipped: readonly SkippedWork[]
	readonly covered: ReadonlySet<string>
	readonly handled: ReadonlySet<string>
}

/** Plans one Spec Run per approved Spec that passes the Spec rules. */
export function planSpecRuns(
	issues: readonly IssueState[],
	context: EligibilityContext,
): SpecRunPass {
	const runs: SpecRun[] = []
	const skipped: SkippedWork[] = []
	const covered = new Set<string>()
	const handled = new Set<string>()

	for (const issue of issues) {
		if (issue.kind !== "spec") continue
		const reason = issueSkipReason(issue, context, "required", null)
		if (reason !== undefined) {
			skipped.push({ issue: issue.key, reason })
			continue
		}
		runs.push(planSpecRun(issue, issues, context, { skipped, covered, handled }))
	}

	return { runs, skipped, covered, handled }
}

type SpecRunResults = {
	readonly skipped: SkippedWork[]
	readonly covered: Set<string>
	readonly handled: Set<string>
}

function planSpecRun(
	spec: IssueState,
	issues: readonly IssueState[],
	context: EligibilityContext,
	results: SpecRunResults,
): SpecRun {
	const tickets: IssueKey[] = []
	for (const ticket of issues) {
		if (!isOpenChild(ticket, spec)) continue
		const reason = issueSkipReason(ticket, context, "covered", spec)
		if (reason !== undefined) {
			results.skipped.push({ issue: ticket.key, reason })
			results.handled.add(keyOf(ticket.key))
			continue
		}
		tickets.push(ticket.key)
		results.covered.add(keyOf(ticket.key))
	}
	return {
		kind: "spec-run",
		spec: spec.key,
		tickets: sortIssueKeys(tickets),
		host: hostOf(spec, context),
	}
}

function isOpenChild(issue: IssueState, spec: IssueState): boolean {
	if (issue.kind !== "ticket" || issue.status !== "open") return false
	if (issue.parentSpec === undefined) return false
	return keyOf(issue.parentSpec) === keyOf(spec.key)
}

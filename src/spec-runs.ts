import { type EligibilityContext, hostOf } from "./context"
import type { IssueKey, IssueState, SkippedWork, SkipReason, SpecRun } from "./contracts"
import { copyIssueKey, keyOf } from "./keys"
import { baseSkipReason, eligibilitySkipReason, issueSkipReason } from "./skip-rules"
import {
	dropBlockedCandidates,
	isOpenChild,
	orderTickets,
	type SpecRunResults,
} from "./spec-dependencies"

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
		const reason = issueSkipReason(issue, context, "required")
		if (reason !== undefined) {
			skipped.push({ issue: copyIssueKey(issue.key), reason })
			continue
		}
		const run = planSpecRun(issue, issues, context, { skipped, covered, handled })
		if (run.tickets.length === 0) {
			skipped.push({ issue: copyIssueKey(issue.key), reason: { code: "no-open-children" } })
			continue
		}
		runs.push(run)
	}

	return { runs, skipped, covered, handled }
}

function planSpecRun(
	spec: IssueState,
	issues: readonly IssueState[],
	context: EligibilityContext,
	results: SpecRunResults,
): SpecRun {
	const specHost = hostOf(spec, context)
	const children = issues.filter((issue) => isOpenChild(issue, spec))
	const siblingKeys = new Set(children.map((child) => keyOf(child.key)))
	const candidates = new Map<string, IssueState>()
	const openBlockers = new Map<string, readonly IssueKey[]>()

	for (const child of children) {
		const base = baseSkipReason(child, context, "covered")
		if (base !== undefined) {
			skipChild(child, base, results)
			continue
		}
		const childHost = hostOf(child, context)
		if (childHost !== specHost) {
			skipChild(child, { code: "different-host", host: childHost }, results)
			continue
		}
		const reason = eligibilitySkipReason(child, context, siblingKeys)
		if (reason !== undefined) {
			skipChild(child, reason, results)
			continue
		}
		candidates.set(keyOf(child.key), child)
		openBlockers.set(
			keyOf(child.key),
			child.blockers.filter((blocker) => blocker.status === "open").map((blocker) => blocker.key),
		)
	}

	dropBlockedCandidates(candidates, openBlockers, siblingKeys, results)
	const coveredTickets = [...candidates.values()]
	for (const ticket of coveredTickets) results.covered.add(keyOf(ticket.key))
	return {
		kind: "spec-run",
		spec: copyIssueKey(spec.key),
		tickets: orderTickets(coveredTickets),
		host: specHost,
	}
}

function skipChild(child: IssueState, reason: SkipReason, results: SpecRunResults): void {
	results.skipped.push({ issue: copyIssueKey(child.key), reason })
	results.handled.add(keyOf(child.key))
}

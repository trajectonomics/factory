import { createContext } from "./context"
import type {
	Allowlist,
	EligibilityPlan,
	EligibleRun,
	RepositoryState,
	SkippedWork,
} from "./contracts"
import { deepFreeze } from "./freeze"
import { sortRuns, sortSkipped } from "./sort"
import { planSpecRuns } from "./spec-runs"
import { planTicketRuns } from "./ticket-runs"

/**
 * Finds the Runs a Dispatcher may launch, and why each other item is skipped.
 *
 * An approved Spec yields one Spec Run over its open children. A child blocked only by a
 * sibling is ordered by that Run; a child blocked from outside the Spec is skipped. A
 * Ticket runs alone only when it has no approved parent Spec. A Ticket labelled
 * `ready-for-human` needs human-only work (a host or cloud change, for example), so it is
 * never Eligible. The first failing rule wins, in the order: closed, needs-human, not
 * allowlisted, not approved, open blocker, live Claim, live thread, parent Spec not eligible.
 */
export function evaluateEligibility(
	state: RepositoryState,
	allowlist: Allowlist,
	nowMs: number,
): EligibilityPlan {
	const context = createContext(state, allowlist, nowMs)
	const specPass = planSpecRuns(state.issues, context)
	const ticketPass = planTicketRuns(state.issues, context, specPass)
	const runs: EligibleRun[] = [...specPass.runs, ...ticketPass.runs]
	const skipped: SkippedWork[] = [...specPass.skipped, ...ticketPass.skipped]
	return deepFreeze({ runs: sortRuns(runs), skipped: sortSkipped(skipped) })
}

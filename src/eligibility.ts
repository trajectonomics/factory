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

/** Finds the Runs a Dispatcher may launch, and why each other item is skipped. */
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

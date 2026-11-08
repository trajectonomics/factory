import type { IssueKey, RepositoryState } from "./contracts"
import { deepFreeze } from "./freeze"
import { indexIssues } from "./issue-index"
import { keyOf } from "./keys"
import type {
	ClaimRelease,
	ReconciliationPlan,
	TicketHandoff,
	TicketRequeue,
} from "./reconciliation-plan"
import { reconcileIssue } from "./reconciliation-rules"
import { compareIssueKeys } from "./sort"

export { PROVIDER_RATE_LIMIT_BACKOFF_MS } from "./reconciliation-rules"

/** The reconciliation decisions for stale Claims and exhausted or rate-limited Tickets in a repository. */
export function reconcileWork(state: RepositoryState, nowMs: number): ReconciliationPlan {
	const issues = indexIssues(state.issues)
	const liveThreads = new Set(state.liveThreads.map(keyOf))
	const releasedClaims: ClaimRelease[] = []
	const handedOffTickets: TicketHandoff[] = []
	const requeuedTickets: TicketRequeue[] = []

	for (const issue of issues.values()) {
		if (liveThreads.has(keyOf(issue.key))) continue
		const decision = reconcileIssue(issue, nowMs)
		if (decision.handoff !== undefined) handedOffTickets.push(decision.handoff)
		if (decision.requeue !== undefined) requeuedTickets.push(decision.requeue)
		if (decision.release !== undefined) releasedClaims.push(decision.release)
	}

	return deepFreeze({
		releasedClaims: releasedClaims.sort(byIssue),
		handedOffTickets: handedOffTickets.sort(byIssue),
		requeuedTickets: requeuedTickets.sort(byIssue),
	})
}

function byIssue(left: { readonly issue: IssueKey }, right: { readonly issue: IssueKey }): number {
	return compareIssueKeys(left.issue, right.issue)
}

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
export function reconcileWork(
	state: RepositoryState,
	nowMs: number,
	atRiskRepositories: ReadonlySet<string> = new Set(),
): ReconciliationPlan {
	const issues = indexIssues(state.issues)
	const liveThreads = new Set(state.liveThreads.map(keyOf))
	const releasedClaims: ClaimRelease[] = []
	const handedOffTickets: TicketHandoff[] = []
	const requeuedTickets: TicketRequeue[] = []

	for (const issue of issues.values()) {
		if (heldForThePass(issue.key, liveThreads, atRiskRepositories)) continue
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

/** Whether a live thread or an unread host holds this issue, so this pass makes no decision on it. */
function heldForThePass(
	issue: IssueKey,
	liveThreads: ReadonlySet<string>,
	atRiskRepositories: ReadonlySet<string>,
): boolean {
	return liveThreads.has(keyOf(issue)) || atRiskRepositories.has(issue.repository)
}

function byIssue(left: { readonly issue: IssueKey }, right: { readonly issue: IssueKey }): number {
	return compareIssueKeys(left.issue, right.issue)
}

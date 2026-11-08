import { isClaimLive } from "./claim"
import type { IssueKey, IssueState, RepositoryState, RunFailure } from "./contracts"
import { deepFreeze } from "./freeze"
import { copyIssueKey, keyOf } from "./keys"
import type {
	ClaimRelease,
	ReconciliationPlan,
	TicketEscalation,
	TicketRequeue,
} from "./reconciliation-plan"
import { countFailedAttempts, latestRunFailure } from "./run-failures"
import { compareIssueKeys } from "./sort"

/** The label a Ticket carries once two failed attempts exhaust it. */
export const ESCALATION_LABEL: TicketEscalation["label"] = "ready-for-human"

/** The delay after a provider rate-limit before the Ticket is retried. */
export const PROVIDER_RATE_LIMIT_BACKOFF_MS: number = 15 * 60 * 1000

const FAILED_ATTEMPT_LIMIT = 2

/** Releases stale Claims, escalates exhausted Tickets and re-queues rate-limited ones. */
export function reconcileWork(state: RepositoryState, nowMs: number): ReconciliationPlan {
	const liveThreads = new Set(state.liveThreads.map(keyOf))
	const releasedClaims: ClaimRelease[] = []
	const escalatedTickets: TicketEscalation[] = []
	const requeuedTickets: TicketRequeue[] = []

	for (const issue of state.issues) {
		if (liveThreads.has(keyOf(issue.key))) continue
		const decision = reconcileIssue(issue, nowMs)
		if (decision.escalation !== undefined) escalatedTickets.push(decision.escalation)
		if (decision.requeue !== undefined) requeuedTickets.push(decision.requeue)
		if (decision.release !== undefined) releasedClaims.push(decision.release)
	}

	return deepFreeze({
		releasedClaims: releasedClaims.sort(byIssue),
		escalatedTickets: escalatedTickets.sort(byIssue),
		requeuedTickets: requeuedTickets.sort(byIssue),
	})
}

type IssueReconciliation = {
	readonly release: ClaimRelease | undefined
	readonly escalation: TicketEscalation | undefined
	readonly requeue: TicketRequeue | undefined
}

function reconcileIssue(issue: IssueState, nowMs: number): IssueReconciliation {
	const failures = issue.runFailures ?? []
	if (countFailedAttempts(failures) >= FAILED_ATTEMPT_LIMIT) {
		return {
			release: staleRelease(issue, nowMs),
			escalation: escalationFor(issue),
			requeue: undefined,
		}
	}
	const requeue = requeueFor(issue, failures)
	return {
		release: requeue === undefined ? staleRelease(issue, nowMs) : undefined,
		escalation: undefined,
		requeue,
	}
}

function escalationFor(issue: IssueState): TicketEscalation | undefined {
	if (!isOpenTicket(issue) || hasEscalationLabel(issue)) return undefined
	return {
		issue: copyIssueKey(issue.key),
		reason: "attempts-exhausted",
		label: ESCALATION_LABEL,
	}
}

function requeueFor(issue: IssueState, failures: readonly RunFailure[]): TicketRequeue | undefined {
	const latest = latestRunFailure(failures)
	if (latest?.cause !== "provider-rate-limit" || !isOpenTicket(issue)) return undefined
	if (hasEscalationLabel(issue) || !claimBelongsToFailedRun(issue, latest)) return undefined
	return {
		issue: copyIssueKey(issue.key),
		reason: "provider-rate-limit",
		retryAtMs: latest.failedAtMs + PROVIDER_RATE_LIMIT_BACKOFF_MS,
	}
}

function isOpenTicket(issue: IssueState): boolean {
	return issue.kind === "ticket" && issue.status === "open"
}

function hasEscalationLabel(issue: IssueState): boolean {
	return issue.labels.includes(ESCALATION_LABEL)
}

function claimBelongsToFailedRun(issue: IssueState, failure: RunFailure): boolean {
	if (issue.claim === undefined) return true
	return issue.claim.claimedAtMs <= failure.failedAtMs
}

function staleRelease(issue: IssueState, nowMs: number): ClaimRelease | undefined {
	if (issue.claim === undefined || isClaimLive(issue.claim, false, nowMs)) return undefined
	return { issue: copyIssueKey(issue.key), reason: "lease-expired" }
}

function byIssue(left: { readonly issue: IssueKey }, right: { readonly issue: IssueKey }): number {
	return compareIssueKeys(left.issue, right.issue)
}

import { isClaimLive } from "./claim"
import type { IssueState } from "./contracts"
import { copyIssueKey } from "./keys"
import type { ClaimRelease, TicketEscalation, TicketRequeue } from "./reconciliation-plan"
import type { RunFailure } from "./run-failure"
import { countFailedAttempts, latestRunFailure } from "./run-failures"

/** The label a Ticket carries once two failed attempts exhaust it. */
export const ESCALATION_LABEL: TicketEscalation["label"] = "ready-for-human"

/** The delay after a provider rate-limit before the Ticket is retried. */
export const PROVIDER_RATE_LIMIT_BACKOFF_MS: number = 15 * 60 * 1000

const FAILED_ATTEMPT_LIMIT = 2
const APPROVAL_LABEL = "ready-for-agent"
const REQUEUE_BLOCKING_LABELS = ["needs-info", "wontfix", ESCALATION_LABEL] as const

/** The actions one issue calls for in a reconciliation pass. */
export type IssueReconciliation = {
	readonly release: ClaimRelease | undefined
	readonly escalation: TicketEscalation | undefined
	readonly requeue: TicketRequeue | undefined
}

/** Decides the release, escalation and requeue actions for one issue. */
export function reconcileIssue(issue: IssueState, nowMs: number): IssueReconciliation {
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
	if (!isOpenTicket(issue) || issue.labels.includes(ESCALATION_LABEL)) return undefined
	return {
		issue: copyIssueKey(issue.key),
		reason: "attempts-exhausted",
		label: ESCALATION_LABEL,
	}
}

function requeueFor(issue: IssueState, failures: readonly RunFailure[]): TicketRequeue | undefined {
	const latest = latestRunFailure(failures)
	if (latest?.cause !== "provider-rate-limit" || !isRequeueableTicket(issue)) return undefined
	if (!claimBelongsToFailedRun(issue, latest)) return undefined
	return {
		issue: copyIssueKey(issue.key),
		reason: "provider-rate-limit",
		retryAtMs: latest.failedAtMs + PROVIDER_RATE_LIMIT_BACKOFF_MS,
	}
}

function isOpenTicket(issue: IssueState): boolean {
	return issue.kind === "ticket" && issue.status === "open"
}

function isRequeueableTicket(issue: IssueState): boolean {
	if (!isOpenTicket(issue) || !issue.labels.includes(APPROVAL_LABEL)) return false
	return !REQUEUE_BLOCKING_LABELS.some((label) => issue.labels.includes(label))
}

function claimBelongsToFailedRun(issue: IssueState, failure: RunFailure): boolean {
	if (issue.claim === undefined) return true
	return issue.claim.claimedAtMs <= failure.failedAtMs
}

function staleRelease(issue: IssueState, nowMs: number): ClaimRelease | undefined {
	if (issue.claim === undefined || isClaimLive(issue.claim, false, nowMs)) return undefined
	return { issue: copyIssueKey(issue.key), reason: "lease-expired" }
}

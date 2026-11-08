import { isClaimLive } from "./claim"
import type { IssueState } from "./contracts"
import { copyIssueKey } from "./keys"
import { NEEDS_INFO_LABEL, READY_FOR_HUMAN_LABEL } from "./labels"
import type { ClaimRelease, TicketHandoff, TicketRequeue } from "./reconciliation-plan"
import type { RunFailure } from "./run-failure"
import { countFailedAttempts, latestRunFailure } from "./run-failures"

/** The delay after a provider rate-limit before the Ticket is retried. */
export const PROVIDER_RATE_LIMIT_BACKOFF_MS: number = 15 * 60 * 1000

const FAILED_ATTEMPT_LIMIT = 2
const APPROVAL_LABEL = "ready-for-agent"
const REQUEUE_BLOCKING_LABELS = [NEEDS_INFO_LABEL, "wontfix", READY_FOR_HUMAN_LABEL] as const

/** The actions one issue calls for in a reconciliation pass. */
export type IssueReconciliation = {
	readonly release: ClaimRelease | undefined
	readonly handoff: TicketHandoff | undefined
	readonly requeue: TicketRequeue | undefined
}

/** Decides the release, handoff and requeue actions for one issue. */
export function reconcileIssue(issue: IssueState, nowMs: number): IssueReconciliation {
	const failures = issue.runFailures ?? []
	if (countFailedAttempts(failures) >= FAILED_ATTEMPT_LIMIT) {
		return {
			release: staleRelease(issue, nowMs),
			handoff: handoffFor(issue),
			requeue: undefined,
		}
	}
	const requeue = requeueFor(issue, failures)
	return {
		release: requeue === undefined ? staleRelease(issue, nowMs) : undefined,
		handoff: undefined,
		requeue,
	}
}

function handoffFor(issue: IssueState): TicketHandoff | undefined {
	if (!isOpenTicket(issue) || issue.labels.includes(READY_FOR_HUMAN_LABEL)) return undefined
	return {
		issue: copyIssueKey(issue.key),
		reason: "attempts-exhausted",
		label: READY_FOR_HUMAN_LABEL,
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

import type { IssueKey } from "./contracts"

/** A Claim released because no live thread held it past its Lease. */
export type ClaimRelease = {
	readonly issue: IssueKey
	readonly reason: "lease-expired"
}

/** A Ticket to label ready-for-human after its second failed attempt. */
export type TicketHandoff = {
	readonly issue: IssueKey
	readonly reason: "attempts-exhausted"
	readonly label: "ready-for-human"
}

/** A rate-limited Ticket to release and run again no earlier than its retry time. */
export type TicketRequeue = {
	readonly issue: IssueKey
	readonly reason: "provider-rate-limit"
	readonly retryAtMs: number
}

/** The decisions from one reconciliation pass. */
export type ReconciliationPlan = {
	readonly releasedClaims: readonly ClaimRelease[]
	readonly handedOffTickets: readonly TicketHandoff[]
	readonly requeuedTickets: readonly TicketRequeue[]
}

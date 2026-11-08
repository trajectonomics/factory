import type { IssueKey } from "./contracts"
import type { FollowUpTicket } from "./follow-up"
import type { GateRound } from "./gate"
import type { FactoryWrite } from "./github/writes"

/** What a Ticket Run reports after spending its Gate rounds. */
export type GateReport = {
	readonly kind: "gate"
	readonly ticket: IssueKey
	readonly title: string
	readonly branch: string
	readonly base: string
	readonly rounds: readonly GateRound[]
	readonly followUps: readonly FollowUpTicket[]
}

/** A spec-gap Exit: the Ticket does not say enough to finish. */
export type SpecGapReport = {
	readonly kind: "spec-gap"
	readonly ticket: IssueKey
	readonly question: string
}

/** An urgent Exit: the Run waits in its thread for the owner. */
export type UrgentReport = {
	readonly kind: "urgent"
	readonly ticket: IssueKey
	readonly reason: string
}

/** What a Ticket Run reports back to the Factory. */
export type TicketRunReport = GateReport | SpecGapReport | UrgentReport

/** The writes and waiting state one Ticket Run calls for. */
export type TicketRunPlan = {
	readonly kind: "rerun" | "ready" | "gate-failure" | "spec-gap" | "urgent"
	readonly waiting: boolean
	readonly writes: readonly FactoryWrite[]
	readonly notification?: string
}

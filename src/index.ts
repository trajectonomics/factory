/** Identifies the package. Replaced by the real modules as the Tickets land. */
export const FACTORY_NAME = "@trajectonomics/factory"

export { CLAIM_LEASE_MS } from "./claim"
export * from "./contracts"
export * from "./dispatch-contracts"
export { runDispatchPass } from "./dispatch-pass"
export * from "./dispatch-pass-contracts"
export { planDispatch } from "./dispatch-plan"
export * from "./dispatch-plan-contracts"
export {
	formatDispatchReport,
	passReport,
	THREE_DAY_REPORT_MS,
	threeDayReport,
} from "./dispatch-report"
export { evaluateEligibility } from "./eligibility"
export * from "./errors"
export type { FollowUpTicket } from "./follow-up"
export type { GateDecision, GateReview, GateReviewEvidence, GateRound } from "./gate"
export { evaluateGate, GateError, MAX_GATE_ROUNDS } from "./gate"
export * from "./github/apply"
export * from "./github/board"
export * from "./github/client"
export * from "./github/create"
export * from "./github/errors"
export * from "./github/read"
export * from "./github/run-writes"
export * from "./github/writes"
export type {
	AuthorAssociation,
	GuardDecision,
	GuardReason,
	HostPressure,
} from "./guard-contracts"
export * from "./host-guard"
export * from "./human-queue"
export * from "./intake-guard"
export * from "./kill-switch"
export type { Notifier } from "./notify"
export { planAndNotifyTicketRun, sendTicketRunNotification } from "./notify"
export * from "./pacing-guard"
export { PROVIDER_RATE_LIMIT_BACKOFF_MS, reconcileWork } from "./reconciliation"
export type {
	ClaimRelease,
	ReconciliationPlan,
	TicketHandoff,
	TicketRequeue,
} from "./reconciliation-plan"
export type { RunLaunchInput } from "./run-launch"
export type { T3Client, T3LaunchRequest, T3Model, T3Thread, T3ThreadStatus } from "./t3"
export type { LaunchMode, RunLaunchOutcome } from "./t3-adapter"
export { launchRun, listLiveThreads } from "./t3-adapter"
export type { T3ErrorCode } from "./t3-errors"
export { T3Error } from "./t3-errors"
export { planTicketRun, startTicketRun } from "./ticket-run"
export { ticketRunBrief } from "./ticket-run-brief"
export type {
	FollowUpReport,
	GateReport,
	SpecGapReport,
	TicketRunPlan,
	TicketRunReport,
	UrgentReport,
} from "./ticket-run-contracts"

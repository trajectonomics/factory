import type { EligibleRun, IssueKey, SkippedWork } from "./contracts"
import type { FactoryPullRequest, HostLoad, RunExit, RunExitKind } from "./dispatch-contracts"
import type { FactoryWrite } from "./github/writes"
import type { GuardDecision } from "./guard-contracts"
import type { ReconciliationPlan } from "./reconciliation-plan"
import type { T3LaunchRequest } from "./t3"

/** The Guard decisions one pass measured, for the report. */
export type HostGuardReport = {
	readonly host: string
	readonly health: GuardDecision
	readonly pacing: GuardDecision
}
/** The Guards one pass measured. */
export type DispatchGuards = {
	readonly queue: GuardDecision
	readonly schedule: GuardDecision
	readonly hosts: readonly HostGuardReport[]
}
/** Why an eligible Run was not launched in this pass. */
export type DispatchDeferralReason =
	| "queue-too-deep"
	| "schedule-disabled"
	| "repository-paused"
	| "repository-busy"
	| "launch-pace"
	| "no-host"
	| "host-pressure"
	| "launch-too-soon"
	| "provider-rate-limit"

/** An eligible Run left for a later pass, with the rule that deferred it. */
export type DispatchDeferral = {
	readonly issue: IssueKey
	readonly reason: DispatchDeferralReason
}
/** One Run in the report, for the 3-day aggregate. */
export type DispatchRunRecord = {
	readonly issue: IssueKey
	readonly kind: EligibleRun["kind"]
	readonly host: string
	readonly launchedAtMs: number
}
/** The Exits the report counts, by type. */
export type DispatchExitCounts = Readonly<Record<RunExitKind, number>>

/** The report the Dispatcher prints, for one pass or for three days. */
export type DispatchReport = {
	readonly runs: readonly DispatchRunRecord[]
	readonly pullRequests: readonly FactoryPullRequest[]
	readonly gateFailures: readonly RunExit[]
	readonly exits: DispatchExitCounts
	readonly staleClaims: readonly IssueKey[]
	readonly hostLoad: readonly HostLoad[]
}
/** One Run this pass launches, or plans in a dry run. */
export type DispatchLaunch = {
	readonly run: EligibleRun
	readonly host: string
	readonly fallback: boolean
	readonly request: T3LaunchRequest
}
/** The decisions one Dispatcher pass makes. */
export type DispatchPlan = {
	readonly guards: DispatchGuards
	readonly reconciliation: ReconciliationPlan
	readonly writes: readonly FactoryWrite[]
	readonly claims: readonly FactoryWrite[]
	readonly launches: readonly DispatchLaunch[]
	readonly deferrals: readonly DispatchDeferral[]
	readonly skipped: readonly SkippedWork[]
	readonly hostLoad: readonly HostLoad[]
}

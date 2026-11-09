import { CLAIM_LABEL } from "./claim"
import type { EligibleRun, IssueKey } from "./contracts"
import { type DispatchConfig, DispatchError, type DispatchReading } from "./dispatch-contracts"
import { assertUniqueHosts, evaluateDispatchGuards, hostLoads } from "./dispatch-guards"
import type { DispatchDeferralReason, DispatchPlan } from "./dispatch-plan-contracts"
import { selectLaunches } from "./dispatch-select"
import {
	busyRepositories,
	reconciledState,
	reconciliationWrites,
	retryWaiters,
} from "./dispatch-state"
import { evaluateEligibility } from "./eligibility"
import { deepFreeze } from "./freeze"
import { claimWrite, type FactoryWrite, labelWrite, statusWrite } from "./github/writes"
import { issueOfRun } from "./keys"
import { reconcileWork } from "./reconciliation"
import { startTicketRun } from "./ticket-run"

/** The decisions one Dispatcher pass makes. */
export function planDispatch(reading: DispatchReading, config: DispatchConfig): DispatchPlan {
	assertConfig(reading, config)
	const reconciliation = reconcileWork(reading.state, reading.nowMs)
	const reconciled = reconciledState(reading.state, reconciliation)
	const guards = evaluateDispatchGuards(reading, config.thresholds)
	const eligibility = evaluateEligibility(reconciled, config.allowlist, reading.nowMs)
	const globalStop = globalStopReason(guards)
	const selection =
		globalStop === undefined
			? selectLaunches({
					runs: eligibility.runs,
					reading,
					config,
					busyRepositories: busyRepositories(reconciled),
					retryWaiters: retryWaiters(reconciliation, reading.nowMs),
				})
			: {
					launches: [],
					deferrals: eligibility.runs.map((run) => ({
						issue: issueOfRun(run),
						reason: globalStop,
					})),
				}
	return deepFreeze({
		guards,
		reconciliation,
		writes: reconciliationWrites(reading.state, reconciliation),
		claims: selection.launches.flatMap((launch) => claimWrites(launch.run, reading.nowMs)),
		launches: selection.launches,
		deferrals: selection.deferrals,
		skipped: eligibility.skipped,
		hostLoad: hostLoads(reading.hosts),
	})
}
function globalStopReason(
	guards: ReturnType<typeof evaluateDispatchGuards>,
): DispatchDeferralReason | undefined {
	if (!guards.schedule.allowed) return "schedule-disabled"
	if (!guards.queue.allowed) return "queue-too-deep"
	return undefined
}
function assertConfig(reading: DispatchReading, config: DispatchConfig): void {
	const pace = config.policy.maxLaunchesPerPass
	if (pace !== undefined && (!Number.isSafeInteger(pace) || pace < 1)) {
		throw new DispatchError(
			"invalid-launch-pace",
			"policy.maxLaunchesPerPass",
			"A launch pace must be a positive integer",
		)
	}
	assertUniqueHosts(reading.hosts)
}
/** The Claim and In progress writes that start one Run. */
export function claimWrites(run: EligibleRun, claimedAtMs: number): readonly FactoryWrite[] {
	if (run.kind === "ticket-run") return startTicketRun(run.ticket, claimedAtMs)
	return runIssues(run).flatMap((issue) => [
		claimWrite(issue, claimedAtMs),
		statusWrite(issue, "In progress"),
	])
}
/** The Claim removals that undo a Run whose launch failed. */
export function releaseWrites(run: EligibleRun): readonly FactoryWrite[] {
	return runIssues(run).map((issue) => labelWrite(issue, CLAIM_LABEL, false))
}
function runIssues(run: EligibleRun): readonly IssueKey[] {
	return run.kind === "spec-run" ? [run.spec, ...run.tickets] : [run.ticket]
}

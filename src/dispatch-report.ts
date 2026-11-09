import type { EligibleRun, IssueKey } from "./contracts"
import type {
	DispatchLedger,
	DispatchReading,
	FactoryPullRequest,
	HostLoad,
	RunExit,
	RunExitKind,
} from "./dispatch-contracts"
import type {
	DispatchExitCounts,
	DispatchPlan,
	DispatchReport,
	DispatchRunRecord,
} from "./dispatch-plan-contracts"
import { deepFreeze } from "./freeze"
import { issueOfRun, keyOf } from "./keys"

/** The three days the Dispatcher's tuning report covers. */
export const THREE_DAY_REPORT_MS: number = 3 * 24 * 60 * 60 * 1000

export { formatDispatchReport, formatLaunch } from "./dispatch-report-format"

/** The report for one pass, from its planned Runs and the ledger it read. */
export function passReport(
	plan: DispatchPlan,
	reading: DispatchReading,
	failedIssues?: ReadonlySet<string>,
): DispatchReport {
	const runs = plan.launches
		.filter((launch) => !failedIssues?.has(keyOf(issueOfRun(launch.run))))
		.map((launch) => runRecordOf(launch.run, launch.host, reading.nowMs))
	return buildReport(
		reading.nowMs,
		runs,
		reading.ledger.pullRequests,
		reading.ledger.exits,
		plan.reconciliation.releasedClaims.map((release) => release.issue),
		plan.hostLoad,
	)
}
/** The report for the three days before `nowMs`, from stored pass records and the ledger. */
export function threeDayReport(
	history: readonly DispatchReport[],
	ledger: DispatchLedger,
	nowMs: number,
): DispatchReport {
	const sinceMs = nowMs - THREE_DAY_REPORT_MS
	const passes = history.filter((report) => inWindow(report.atMs, sinceMs, nowMs))
	return buildReport(
		nowMs,
		passes.flatMap((report) => report.runs),
		ledger.pullRequests.filter((pullRequest) => inWindow(pullRequest.openedAtMs, sinceMs, nowMs)),
		ledger.exits.filter((exit) => inWindow(exit.atMs, sinceMs, nowMs)),
		passes.flatMap((report) => report.staleClaims),
		latestHostLoad(passes.flatMap((report) => report.hostLoad)),
	)
}
function runRecordOf(run: EligibleRun, host: string, nowMs: number): DispatchRunRecord {
	return {
		issue: issueOfRun(run),
		kind: run.kind,
		host,
		launchedAtMs: nowMs,
	}
}
function buildReport(
	atMs: number,
	runs: readonly DispatchRunRecord[],
	pullRequests: readonly FactoryPullRequest[],
	exits: readonly RunExit[],
	staleClaims: readonly IssueKey[],
	hostLoad: readonly HostLoad[],
): DispatchReport {
	return deepFreeze({
		atMs,
		runs,
		pullRequests,
		gateFailures: exits.filter((exit) => exit.kind === "gate-failure"),
		exits: countExits(exits),
		staleClaims,
		hostLoad,
	})
}
function countExits(exits: readonly RunExit[]): DispatchExitCounts {
	const counts: Record<RunExitKind, number> = {
		"spec-gap": 0,
		"follow-up": 0,
		urgent: 0,
		"gate-failure": 0,
	}
	for (const exit of exits) counts[exit.kind] += 1
	return counts
}
function inWindow(atMs: number, sinceMs: number, untilMs: number): boolean {
	return atMs >= sinceMs && atMs <= untilMs
}
function latestHostLoad(loads: readonly HostLoad[]): readonly HostLoad[] {
	const byHost = new Map<string, HostLoad>()
	for (const load of loads) byHost.set(load.host, load)
	return [...byHost.values()]
}

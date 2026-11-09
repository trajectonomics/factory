import type { EligibleRun, IssueKey } from "./contracts"
import type {
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

export { formatDispatchReport, formatLaunch } from "./dispatch-report-format"

/** The report for one pass, from its planned Runs and the ledger it read. */
export function passReport(
	plan: DispatchPlan,
	reading: DispatchReading,
	failedIssues?: ReadonlySet<string>,
): DispatchReport {
	const runs = plan.launches
		.filter((launch) => !failedIssues?.has(keyOf(issueOfRun(launch.run))))
		.map((launch) => runRecordOf(launch.run, launch.host))
	return buildReport(
		runs,
		reading.ledger.pullRequests,
		reading.ledger.exits,
		plan.reconciliation.releasedClaims.map((release) => release.issue),
		plan.hostLoad,
	)
}
function runRecordOf(run: EligibleRun, host: string): DispatchRunRecord {
	return { issue: issueOfRun(run), kind: run.kind, host }
}
function buildReport(
	runs: readonly DispatchRunRecord[],
	pullRequests: readonly FactoryPullRequest[],
	exits: readonly RunExit[],
	staleClaims: readonly IssueKey[],
	hostLoad: readonly HostLoad[],
): DispatchReport {
	return deepFreeze({
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

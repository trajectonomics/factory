import { CLAIM_LABEL } from "./claim"
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
	const claimed = new Set(
		reading.state.issues
			.filter((issue) => issue.claim !== undefined || issue.labels.includes(CLAIM_LABEL))
			.map((issue) => keyOf(issue.key)),
	)
	const staleClaims = [
		...plan.reconciliation.releasedClaims,
		...plan.reconciliation.requeuedTickets.filter((requeue) => claimed.has(keyOf(requeue.issue))),
	].map((release) => release.issue)
	return buildReport(
		runs,
		reading.ledger.pullRequests,
		reading.ledger.exits,
		staleClaims,
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

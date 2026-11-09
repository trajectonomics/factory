import type { EligibleRun, IssueKey } from "./contracts"
import type { DispatchConfig, DispatchReading } from "./dispatch-contracts"
import { dueRun } from "./dispatch-due"
import { placeRun } from "./dispatch-placement"
import type {
	DispatchDeferral,
	DispatchDeferralReason,
	DispatchLaunch,
} from "./dispatch-plan-contracts"
import { dispatchRequest } from "./dispatch-request"
import { evaluateKillSwitch } from "./kill-switch"

/** The eligibility results and pass state the selection reads. */
export type SelectionInput = {
	readonly runs: readonly EligibleRun[]
	readonly reading: DispatchReading
	readonly config: DispatchConfig
	readonly busyRepositories: ReadonlySet<string>
	readonly retryWaiters: ReadonlySet<string>
}
/** The Runs one pass launches, and the eligible Runs it defers. */
export type Selection = {
	readonly launches: readonly DispatchLaunch[]
	readonly deferrals: readonly DispatchDeferral[]
}
/** Selects the Runs to launch, within the Guards and the configured limits. */
export function selectLaunches(input: SelectionInput): Selection {
	const launches: DispatchLaunch[] = []
	const deferrals: DispatchDeferral[] = []
	const selectedRepositories = new Set<string>()
	const plannedPerHost = new Map<string, number>()
	for (const run of input.runs) {
		const reason = deferralFor(run, input, selectedRepositories, launches.length)
		if (reason !== undefined) {
			deferrals.push({ issue: issueOf(run), reason })
			continue
		}
		const due = dueRun(run, input.retryWaiters)
		if (due === undefined) {
			deferrals.push({ issue: issueOf(run), reason: "provider-rate-limit" })
			continue
		}
		const placement = placeRun(due, input.reading, input.config, plannedPerHost)
		if ("reason" in placement) {
			deferrals.push({ issue: issueOf(run), reason: placement.reason })
			continue
		}
		launches.push({
			run: due,
			host: placement.host,
			fallback: placement.fallback,
			request: dispatchRequest(due, input),
		})
		selectedRepositories.add(issueOf(due).repository)
		plannedPerHost.set(placement.host, (plannedPerHost.get(placement.host) ?? 0) + 1)
	}
	return { launches, deferrals }
}
function deferralFor(
	run: EligibleRun,
	input: SelectionInput,
	selectedRepositories: ReadonlySet<string>,
	launchCount: number,
): DispatchDeferralReason | undefined {
	const issue = issueOf(run)
	const killSwitch = evaluateKillSwitch(input.reading.killSwitch, issue.repository)
	if (!killSwitch.allowed) {
		return killSwitch.reason.code === "repository-paused"
			? "repository-paused"
			: "schedule-disabled"
	}
	if (capReached(input.config, launchCount)) return "launch-cap"
	return repositoryReason(issue.repository, input, selectedRepositories)
}
function capReached(config: DispatchConfig, launchCount: number): boolean {
	const cap = config.policy.maxLaunchesPerPass
	return cap !== undefined && launchCount >= cap
}
function repositoryReason(
	repository: string,
	input: SelectionInput,
	selectedRepositories: ReadonlySet<string>,
): DispatchDeferralReason | undefined {
	if (!input.config.policy.oneRunPerRepository) return undefined
	if (input.busyRepositories.has(repository)) return "repository-busy"
	if (selectedRepositories.has(repository)) return "repository-busy"
	return undefined
}
function issueOf(run: EligibleRun): IssueKey {
	return run.kind === "spec-run" ? run.spec : run.ticket
}

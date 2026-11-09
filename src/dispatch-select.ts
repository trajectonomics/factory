import type { EligibleRun } from "./contracts"
import type { DispatchConfig, DispatchReading } from "./dispatch-contracts"
import { dueRun } from "./dispatch-due"
import { placeRun } from "./dispatch-placement"
import type {
	DispatchDeferral,
	DispatchDeferralReason,
	DispatchLaunch,
} from "./dispatch-plan-contracts"
import { dispatchRequest } from "./dispatch-request"
import { deepFreeze } from "./freeze"
import { issueOfRun } from "./keys"
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
/** The Runs one pass launches, within the Guards and the configured pace. */
export function selectLaunches(input: SelectionInput): Selection {
	const launches: DispatchLaunch[] = []
	const deferrals: DispatchDeferral[] = []
	const selectedRepositories = new Set<string>()
	const plannedPerHost = new Map<string, number>()
	for (const run of input.runs) {
		const reason = deferralFor(run, input, selectedRepositories, launches.length)
		if (reason !== undefined) {
			deferrals.push({ issue: issueOfRun(run), reason })
			continue
		}
		const due = dueRun(run, input.retryWaiters)
		if (due === undefined) {
			deferrals.push({ issue: issueOfRun(run), reason: "provider-rate-limit" })
			continue
		}
		const placement = placeRun(due, input.reading, input.config, plannedPerHost)
		if ("reason" in placement) {
			deferrals.push({ issue: issueOfRun(run), reason: placement.reason })
			continue
		}
		launches.push({
			run: due,
			host: placement.host,
			fallback: placement.fallback,
			request: dispatchRequest(due, input),
		})
		selectedRepositories.add(issueOfRun(due).repository)
		plannedPerHost.set(placement.host, (plannedPerHost.get(placement.host) ?? 0) + 1)
	}
	return deepFreeze({ launches, deferrals })
}
function deferralFor(
	run: EligibleRun,
	input: SelectionInput,
	selectedRepositories: ReadonlySet<string>,
	launchCount: number,
): DispatchDeferralReason | undefined {
	const issue = issueOfRun(run)
	const killSwitch = evaluateKillSwitch(input.reading.killSwitch, issue.repository)
	if (!killSwitch.allowed) {
		return killSwitch.reason.code === "repository-paused"
			? "repository-paused"
			: "schedule-disabled"
	}
	if (paceReached(input.config, launchCount)) return "launch-pace"
	return repositoryReason(issue.repository, input, selectedRepositories)
}
function paceReached(config: DispatchConfig, launchCount: number): boolean {
	const pace = config.policy.maxLaunchesPerPass
	return pace !== undefined && launchCount >= pace
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

import type { IssueState } from "./contracts"
import { type GuardDecision, launchAllowed, launchStopped } from "./guard-contracts"

/** The label that pauses launches for its repository. */
export const PAUSE_LABEL: string = "factory:pause"

/** The kill switch: whether the schedule runs and which repositories are paused. */
export type KillSwitch = {
	readonly scheduleEnabled: boolean
	readonly pausedRepositories: readonly string[]
}

/** The repositories whose open issues carry the factory:pause label, in repository order. */
export function pausedRepositories(issues: readonly IssueState[]): readonly string[] {
	const repositories = new Set<string>()
	for (const issue of issues) {
		if (issue.status === "open" && issue.labels.includes(PAUSE_LABEL)) {
			repositories.add(issue.key.repository)
		}
	}
	return Object.freeze([...repositories].sort())
}

/** The Guard decision on schedule status and paused repositories. */
export function evaluateKillSwitch(killSwitch: KillSwitch, repository: string): GuardDecision {
	if (!killSwitch.scheduleEnabled) return launchStopped({ code: "schedule-disabled" })
	if (killSwitch.pausedRepositories.includes(repository)) {
		return launchStopped({ code: "repository-paused", repository })
	}
	return launchAllowed()
}

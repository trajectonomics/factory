import type { IssueKey, IssueState, RepositoryState } from "../contracts"
import type { DispatchConfig, DispatchReading, HostSnapshot } from "../dispatch-contracts"
import type { SkillLock } from "../skill-lock"
import { SKILL_PROFILE } from "../skill-profile"

export const NOW_MS = 1_000_000_000
export const CLI = "trajectonomics/cli"
export const FACTORY = "trajectonomics/factory"

export function key(number: number, repository: string = CLI): IssueKey {
	return { repository, number }
}
export function issue(number: number, overrides: Partial<IssueState> = {}): IssueState {
	return {
		key: key(number),
		kind: "ticket",
		status: "open",
		labels: [],
		title: `Ticket ${number}`,
		blockers: [],
		...overrides,
	}
}
export function approved(number: number, overrides: Partial<IssueState> = {}): IssueState {
	return issue(number, { labels: ["ready-for-agent"], ...overrides })
}
export function spec(number: number, overrides: Partial<IssueState> = {}): IssueState {
	return issue(number, {
		kind: "spec",
		labels: ["ready-for-agent"],
		title: `Spec ${number}`,
		...overrides,
	})
}
export function state(
	issues: readonly IssueState[],
	liveThreads: readonly IssueKey[] = [],
): RepositoryState {
	return { issues, liveThreads }
}
export function host(overrides: Partial<HostSnapshot> = {}): HostSnapshot {
	return {
		host: "homeserver2",
		readiness: "ready",
		reachable: true,
		repositories: [CLI, FACTORY],
		liveRuns: 0,
		health: { loadAverage: 1, memoryUsedFraction: 0.2, diskUsedFraction: 0.3 },
		...overrides,
	}
}
export function reading(overrides: Partial<DispatchReading> = {}): DispatchReading {
	return {
		state: state([]),
		hosts: [host()],
		humanQueue: { openPullRequests: 0, needsSpecReview: 0, readyForHuman: 0 },
		killSwitch: { scheduleEnabled: true, pausedRepositories: [] },
		ledger: { pullRequests: [], exits: [] },
		nowMs: NOW_MS,
		...overrides,
	}
}
/** A skills lock that matches the curated profile for every required skill. */
export function matchingLock(): SkillLock {
	return { kind: "locked", skills: { ...SKILL_PROFILE.skills } }
}

export function config(overrides: Partial<DispatchConfig> = {}): DispatchConfig {
	return {
		mode: "live",
		allowlist: [
			{ repository: CLI, host: "homeserver2" },
			{ repository: FACTORY, host: "homeserver2" },
		],
		policy: { oneRunPerRepository: true },
		thresholds: {
			queueDepth: 6,
			launchIntervalMs: 0,
			host: { loadAverage: 4, memoryUsedFraction: 0.85, diskUsedFraction: 0.9 },
		},
		model: { provider: "pi", model: "command-code/deepseek/deepseek-v4.1-flash" },
		...overrides,
	}
}

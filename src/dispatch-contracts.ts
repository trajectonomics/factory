import type { Allowlist, IssueKey, RepositoryState } from "./contracts"
import type { HostHealth, HostThresholds } from "./host-guard"
import type { HumanQueue } from "./human-queue"
import type { KillSwitch } from "./kill-switch"
import type { T3Model } from "./t3"

/** Whether the Dispatcher applies its decisions or only prints them. */
export type DispatchMode = "dry-run" | "live"

/** The launch limits the owner tunes, rather than hard-coded caps. */
export type DispatchPolicy = {
	readonly oneRunPerRepository: boolean
	readonly maxLaunchesPerPass?: number
}
/** The measured pressures at which the Guards stop launches. */
export type DispatchThresholds = {
	readonly queueDepth: number
	readonly launchIntervalMs: number
	readonly host: HostThresholds
}
/** Whether a host may take Runs. */
export type HostReadiness = "ready" | "pending"

/** One host as the Dispatcher reads it for a pass. */
export type HostSnapshot = {
	readonly host: string
	readonly readiness: HostReadiness
	readonly reachable: boolean
	readonly repositories: readonly string[]
	readonly liveRuns: number
	readonly health: HostHealth
	readonly lastLaunchAtMs?: number
}
/** One host's measurements for the report. */
export type HostLoad = {
	readonly host: string
	readonly loadAverage: number
	readonly memoryUsedFraction: number
	readonly diskUsedFraction: number
}
/** A Factory pull request as the report reads it. */
export type FactoryPullRequest = {
	readonly issue: IssueKey
	readonly number: number
	readonly head: string
	readonly draft: boolean
	readonly openedAtMs: number
}
/** The four ways a Run stops short of a ready pull request. */
export type RunExitKind = "spec-gap" | "follow-up" | "urgent" | "gate-failure"

/** One Run Exit as the report reads it. */
export type RunExit = {
	readonly issue: IssueKey
	readonly kind: RunExitKind
	readonly atMs: number
}
/** The pull requests and Exits the report reads beyond repository state. */
export type DispatchLedger = {
	readonly pullRequests: readonly FactoryPullRequest[]
	readonly exits: readonly RunExit[]
}
/** Everything one Dispatcher pass reads before it decides. */
export type DispatchReading = {
	readonly state: RepositoryState
	readonly hosts: readonly HostSnapshot[]
	readonly humanQueue: HumanQueue
	readonly killSwitch: KillSwitch
	readonly ledger: DispatchLedger
	readonly nowMs: number
}
/** What the Dispatcher may do, and the thresholds it applies. */
export type DispatchConfig = {
	readonly mode: DispatchMode
	readonly allowlist: Allowlist
	readonly policy: DispatchPolicy
	readonly thresholds: DispatchThresholds
	readonly model: T3Model
}
/** The inputs a Dispatcher pass rejects. */
export type DispatchErrorCode = "invalid-launch-cap" | "duplicate-host"

/** A malformed Dispatcher configuration or reading. */
export class DispatchError extends Error {
	readonly code: DispatchErrorCode
	readonly field: string

	constructor(code: DispatchErrorCode, field: string, message: string) {
		super(message)
		this.name = "DispatchError"
		this.code = code
		this.field = field
	}
}

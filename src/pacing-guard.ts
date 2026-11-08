import { type GuardDecision, launchAllowed, launchStopped } from "./guard-contracts"

/** The last launch on a host and the minimum spacing before the next. */
export type LaunchPacing = {
	readonly lastLaunchAtMs?: number
	readonly nowMs: number
	readonly minIntervalMs: number
}

/** Stops a launch that arrives before the host's pacing interval has passed. */
export function evaluatePacingGuard(pacing: LaunchPacing): GuardDecision {
	if (pacing.lastLaunchAtMs === undefined) return launchAllowed()
	const elapsedMs = pacing.nowMs - pacing.lastLaunchAtMs
	if (elapsedMs >= pacing.minIntervalMs) return launchAllowed()
	return launchStopped({ code: "launch-too-soon", waitMs: pacing.minIntervalMs - elapsedMs })
}

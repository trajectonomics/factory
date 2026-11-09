import type { EligibleRun } from "./contracts"
import type { DispatchConfig, DispatchReading, HostSnapshot } from "./dispatch-contracts"
import type { DispatchDeferralReason } from "./dispatch-plan-contracts"
import { evaluateHostGuard } from "./host-guard"
import { evaluatePacingGuard } from "./pacing-guard"

/** The host a Run is placed on, or why no host is a candidate. */
export type Placement =
	| { readonly host: string; readonly fallback: boolean }
	| { readonly reason: DispatchDeferralReason }
/** The host placement for a planned Run, or the reason it stays. */
export function placeRun(
	run: EligibleRun,
	reading: DispatchReading,
	config: DispatchConfig,
	plannedPerHost: ReadonlyMap<string, number>,
): Placement {
	const repository = run.kind === "spec-run" ? run.spec.repository : run.ticket.repository
	const candidates = reading.hosts.filter(
		(host) =>
			host.readiness === "ready" && host.reachable && host.repositories.includes(repository),
	)
	if (candidates.length === 0) return { reason: "no-host" }
	const healthy = candidates.filter((host) =>
		allowed(evaluateHostGuard(host.health, config.thresholds.host)),
	)
	if (healthy.length === 0) return { reason: "host-pressure" }
	const paced = healthy.filter((host) =>
		allowed(pacingDecision(host, reading, config, plannedPerHost)),
	)
	if (paced.length === 0) return { reason: "launch-too-soon" }
	const chosen = leastLoaded(paced, plannedPerHost)
	return { host: chosen.host, fallback: chosen.host !== run.host }
}
function pacingDecision(
	host: HostSnapshot,
	reading: DispatchReading,
	config: DispatchConfig,
	plannedPerHost: ReadonlyMap<string, number>,
) {
	const launchedThisPass = plannedPerHost.has(host.host)
	const lastLaunchAtMs = launchedThisPass ? reading.nowMs : host.lastLaunchAtMs
	return evaluatePacingGuard({
		nowMs: reading.nowMs,
		minIntervalMs: config.thresholds.launchIntervalMs,
		...(lastLaunchAtMs === undefined ? {} : { lastLaunchAtMs }),
	})
}
function allowed(decision: { readonly allowed: boolean }): boolean {
	return decision.allowed
}
function leastLoaded(hosts: readonly HostSnapshot[], plannedPerHost: ReadonlyMap<string, number>) {
	return hosts.reduce((best, host) =>
		score(host, plannedPerHost) < score(best, plannedPerHost) ? host : best,
	)
}
function score(host: HostSnapshot, plannedPerHost: ReadonlyMap<string, number>): number {
	return host.liveRuns + (plannedPerHost.get(host.host) ?? 0)
}

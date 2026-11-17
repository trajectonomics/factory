import type { EligibleRun } from "./contracts"
import type { DispatchConfig, DispatchReading, HostSnapshot } from "./dispatch-contracts"
import type { DispatchDeferralReason } from "./dispatch-plan-contracts"
import { atRiskRepositories, liveCountOf } from "./dispatch-threads"
import { deepFreeze } from "./freeze"
import { evaluateHostGuard } from "./host-guard"
import { issueOfRun } from "./keys"
import { evaluatePacingGuard } from "./pacing-guard"

/** The host a Run is placed on, or why no host is a candidate. */
export type Placement =
	| { readonly host: string; readonly fallback: boolean }
	| { readonly reason: DispatchDeferralReason }
/** One placement candidate: a host that was read and carries the Run's repository. */
type Candidate = {
	readonly host: HostSnapshot
	readonly liveThreads: number
}
/** The host placement for a planned Run, or the reason it stays. */
export function placeRun(
	run: EligibleRun,
	reading: DispatchReading,
	config: DispatchConfig,
	plannedPerHost: ReadonlyMap<string, number>,
): Placement {
	const repository = issueOfRun(run).repository
	if (atRiskRepositories(reading.hosts, reading.threads).has(repository)) {
		return deepFreeze({ reason: "host-unread" })
	}
	const candidates = candidatesFor(repository, reading)
	if (candidates.length === 0) return deepFreeze({ reason: "no-host" })
	const healthy = candidates.filter((candidate) =>
		allowed(evaluateHostGuard(candidate.host.health, config.thresholds.host)),
	)
	if (healthy.length === 0) return deepFreeze({ reason: "host-pressure" })
	const paced = healthy.filter((candidate) =>
		allowed(pacingDecision(candidate.host, reading, config, plannedPerHost)),
	)
	if (paced.length === 0) return deepFreeze({ reason: "launch-too-soon" })
	const chosen = leastLoaded(paced, plannedPerHost)
	return deepFreeze({ host: chosen.host.host, fallback: chosen.host.host !== run.host })
}
/** The hosts that may take this repository: ready, reachable, carrying it, and read this pass. */
function candidatesFor(repository: string, reading: DispatchReading): readonly Candidate[] {
	const candidates: Candidate[] = []
	for (const host of reading.hosts) {
		if (host.readiness !== "ready" || !host.reachable) continue
		if (!host.repositories.includes(repository)) continue
		const liveThreads = liveCountOf(reading.threads, host.host)
		if (liveThreads === undefined) continue
		candidates.push({ host, liveThreads })
	}
	return candidates
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
function leastLoaded(
	candidates: readonly Candidate[],
	plannedPerHost: ReadonlyMap<string, number>,
): Candidate {
	return candidates.reduce((best, candidate) =>
		score(candidate, plannedPerHost) < score(best, plannedPerHost) ? candidate : best,
	)
}
function score(candidate: Candidate, plannedPerHost: ReadonlyMap<string, number>): number {
	return candidate.liveThreads + (plannedPerHost.get(candidate.host.host) ?? 0)
}

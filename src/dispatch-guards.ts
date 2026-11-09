import {
	DispatchError,
	type DispatchReading,
	type DispatchThresholds,
	type HostLoad,
	type HostSnapshot,
} from "./dispatch-contracts"
import type { DispatchGuards, HostGuardReport } from "./dispatch-plan-contracts"
import { deepFreeze } from "./freeze"
import { launchAllowed, launchStopped } from "./guard-contracts"
import { evaluateHostGuard } from "./host-guard"
import { evaluateQueueGuard } from "./human-queue"
import { evaluatePacingGuard } from "./pacing-guard"

/** The Guards one pass measured, before any Run is placed. */
export function evaluateDispatchGuards(
	reading: DispatchReading,
	thresholds: DispatchThresholds,
): DispatchGuards {
	return deepFreeze({
		schedule: reading.killSwitch.scheduleEnabled
			? launchAllowed()
			: launchStopped({ code: "schedule-disabled" }),
		queue: evaluateQueueGuard(reading.humanQueue, thresholds.queueDepth),
		hosts: reading.hosts.map((host) => hostGuardReport(host, reading.nowMs, thresholds)),
	})
}
function hostGuardReport(
	host: HostSnapshot,
	nowMs: number,
	thresholds: DispatchThresholds,
): HostGuardReport {
	return {
		host: host.host,
		health: evaluateHostGuard(host.health, thresholds.host),
		pacing: evaluatePacingGuard({
			nowMs,
			minIntervalMs: thresholds.launchIntervalMs,
			...(host.lastLaunchAtMs === undefined ? {} : { lastLaunchAtMs: host.lastLaunchAtMs }),
		}),
	}
}
/** The measured load of every host in the pass. */
export function hostLoads(hosts: readonly HostSnapshot[]): readonly HostLoad[] {
	return deepFreeze(
		hosts.map((host) => ({
			host: host.host,
			loadAverage: host.health.loadAverage,
			memoryUsedFraction: host.health.memoryUsedFraction,
			diskUsedFraction: host.health.diskUsedFraction,
		})),
	)
}
/** Rejects a reading that names one host twice. */
export function assertUniqueHosts(hosts: readonly HostSnapshot[]): void {
	const names = new Set<string>()
	for (const host of hosts) {
		if (names.has(host.host)) {
			throw new DispatchError(
				"duplicate-host",
				`hosts[${host.host}]`,
				`The Dispatcher read ${host.host} twice`,
			)
		}
		names.add(host.host)
	}
}

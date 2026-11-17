import type {
	DispatchReading,
	DispatchThresholds,
	HostLoad,
	HostReading,
	HostSnapshot,
} from "./dispatch-contracts"
import type { DispatchGuards, HostGuardReport } from "./dispatch-plan-contracts"
import { liveCountOfHost } from "./dispatch-threads"
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
/** The measured load of every host in the pass, with the live threads counted from the reading. */
export function hostLoads(reading: HostReading): readonly HostLoad[] {
	return deepFreeze(reading.hosts.map((host) => hostLoadOf(host, liveCountOfHost(reading, host))))
}
function hostLoadOf(host: HostSnapshot, liveThreads: number | undefined): HostLoad {
	return {
		host: host.host,
		loadAverage: host.health.loadAverage,
		memoryUsedFraction: host.health.memoryUsedFraction,
		diskUsedFraction: host.health.diskUsedFraction,
		...(liveThreads === undefined ? {} : { liveThreads }),
	}
}

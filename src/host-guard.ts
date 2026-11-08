import {
	type GuardDecision,
	type HostPressure,
	launchAllowed,
	launchStopped,
} from "./guard-contracts"

/** The host measurements the Guard reads: load average, memory used fraction and disk used fraction. */
export type HostHealth = {
	readonly loadAverage: number
	readonly memoryUsedFraction: number
	readonly diskUsedFraction: number
}

/** The host measurements above which the host is unhealthy. */
export type HostThresholds = {
	readonly loadAverage: number
	readonly memoryUsedFraction: number
	readonly diskUsedFraction: number
}

/** The Guard decision on host load, memory and disk health against thresholds. */
export function evaluateHostGuard(health: HostHealth, thresholds: HostThresholds): GuardDecision {
	const pressures = hostPressures(health, thresholds)
	if (pressures.length === 0) return launchAllowed()
	return launchStopped({ code: "host-pressure", pressures })
}

function crossed(value: number, threshold: number): boolean {
	return !Number.isFinite(value) || value > threshold
}

function hostPressures(health: HostHealth, thresholds: HostThresholds): HostPressure[] {
	const pressures: HostPressure[] = []
	if (crossed(health.loadAverage, thresholds.loadAverage)) {
		pressures.push({
			code: "load",
			loadAverage: health.loadAverage,
			threshold: thresholds.loadAverage,
		})
	}
	if (crossed(health.memoryUsedFraction, thresholds.memoryUsedFraction)) {
		pressures.push({
			code: "memory",
			usedFraction: health.memoryUsedFraction,
			threshold: thresholds.memoryUsedFraction,
		})
	}
	if (crossed(health.diskUsedFraction, thresholds.diskUsedFraction)) {
		pressures.push({
			code: "disk",
			usedFraction: health.diskUsedFraction,
			threshold: thresholds.diskUsedFraction,
		})
	}
	return pressures
}

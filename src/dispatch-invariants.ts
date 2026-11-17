import type { DispatchConfig, DispatchReading } from "./dispatch-contracts"
import { DispatchError } from "./dispatch-contracts"

/** The inputs a Dispatcher pass rejects before it decides anything. */
export function assertDispatchInput(reading: DispatchReading, config: DispatchConfig): void {
	assertLaunchPace(config)
	assertUniqueHosts(
		"hosts",
		reading.hosts.map((host) => host.host),
	)
	assertUniqueHosts(
		"threads",
		reading.threads.map((entry) => entry.host),
	)
}

function assertLaunchPace(config: DispatchConfig): void {
	const pace = config.policy.maxLaunchesPerPass
	if (pace === undefined) return
	if (Number.isSafeInteger(pace) && pace >= 1) return
	throw new DispatchError(
		"invalid-launch-pace",
		"policy.maxLaunchesPerPass",
		"A launch pace must be a positive integer",
	)
}

function assertUniqueHosts(field: string, hosts: readonly string[]): void {
	const seen = new Set<string>()
	for (const host of hosts) {
		if (seen.has(host)) {
			throw new DispatchError(
				"duplicate-host",
				field,
				`The pass names the host ${host} more than once`,
			)
		}
		seen.add(host)
	}
}

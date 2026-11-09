import type { DispatchAdapters, DispatchLaunchError } from "./dispatch-pass-contracts"
import { statusWrites } from "./dispatch-plan"
import type { DispatchPlan } from "./dispatch-plan-contracts"
import { formatLaunch } from "./dispatch-report"
import { formatWrite } from "./github/format-write"
import { keyOf } from "./keys"

/** Prints every decision a dry run would make. */
export function printPlan(
	adapters: DispatchAdapters,
	plan: DispatchPlan,
): readonly DispatchLaunchError[] {
	for (const write of [...plan.writes, ...plan.claims]) adapters.print(formatWrite(write))
	for (const host of plan.guards.hosts) {
		adapters.print(
			`guard ${host.host}: health ${allowed(host.health.allowed)}, pacing ${allowed(host.pacing.allowed)}`,
		)
	}
	adapters.print(`guard schedule: ${allowed(plan.guards.schedule.allowed)}`)
	adapters.print(`guard queue: ${allowed(plan.guards.queue.allowed)}`)
	for (const launch of plan.launches) {
		for (const write of statusWrites(launch.run)) adapters.print(formatWrite(write))
		adapters.print(formatLaunch(launch))
	}
	for (const skip of plan.skipped) adapters.print(`skip ${keyOf(skip.issue)}: ${skip.reason.code}`)
	for (const deferral of plan.deferrals) {
		adapters.print(`defer ${keyOf(deferral.issue)}: ${deferral.reason}`)
	}
	return []
}

function allowed(value: boolean): string {
	return value ? "allowed" : "stopped"
}

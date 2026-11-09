import type { DispatchAdapters, DispatchLaunchError } from "./dispatch-pass-contracts"
import { releaseWrites, statusWrites } from "./dispatch-plan"
import type { DispatchLaunch, DispatchPlan } from "./dispatch-plan-contracts"
import type { FactoryWrite } from "./github/writes"
import { issueOfRun, keyOf } from "./keys"
/** The writes applied and the errors seen before and during one pass's launches. */
export type ApplyOutcome = {
	readonly errors: readonly DispatchLaunchError[]
	readonly applied: boolean
	readonly released?: ReadonlySet<string>
	readonly writeError?: string
}
/** Applies one plan's writes and launches, keeping launch and Status failures. */
export async function applyPlan(
	adapters: DispatchAdapters,
	plan: DispatchPlan,
): Promise<ApplyOutcome> {
	const released = new Set<string>()
	try {
		for (const write of plan.writes) {
			await applyBatch(adapters, [write])
			released.add(keyOf(write.issue))
		}
		await applyBatch(adapters, plan.claims)
	} catch (error) {
		return { errors: [], applied: false, released, writeError: messageOf(error) }
	}
	const errors: DispatchLaunchError[] = []
	for (const launch of plan.launches) {
		const error = await launchRun(adapters, launch)
		if (error !== undefined) {
			errors.push(error)
			continue
		}
		try {
			await applyBatch(adapters, statusWrites(launch.run))
		} catch (statusError) {
			errors.push({
				issue: issueOfRun(launch.run),
				message: `launch succeeded; In progress failed: ${messageOf(statusError)}`,
				launched: true,
			})
		}
	}
	return { errors, applied: true, released }
}
async function applyBatch(
	adapters: DispatchAdapters,
	writes: readonly FactoryWrite[],
): Promise<void> {
	if (writes.length > 0) await adapters.applyWrites(writes)
}
async function launchRun(
	adapters: DispatchAdapters,
	launch: DispatchLaunch,
): Promise<DispatchLaunchError | undefined> {
	const issue = issueOfRun(launch.run)
	try {
		await adapters.launch(launch.request, launch.host)
		return undefined
	} catch (error) {
		try {
			await adapters.applyWrites(releaseWrites(launch.run))
		} catch (cleanupError) {
			return {
				issue,
				message: `${messageOf(error)}; claim release failed: ${messageOf(cleanupError)}`,
				launched: false,
			}
		}
		return { issue, message: messageOf(error), launched: false }
	}
}
function messageOf(error: unknown): string {
	return error instanceof Error ? error.message : String(error)
}

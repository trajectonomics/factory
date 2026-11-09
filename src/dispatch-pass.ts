import type { DispatchConfig } from "./dispatch-contracts"
import type {
	DispatchAdapters,
	DispatchLaunchError,
	DispatchPassResult,
} from "./dispatch-pass-contracts"
import { printPlan } from "./dispatch-pass-print"
import { planDispatch, releaseWrites, statusWrites } from "./dispatch-plan"
import type { DispatchLaunch, DispatchPlan } from "./dispatch-plan-contracts"
import { formatDispatchReport, passReport } from "./dispatch-report"
import { deepFreeze } from "./freeze"
import type { FactoryWrite } from "./github/writes"
import { issueOfRun, keyOf } from "./keys"

/** The Dispatcher pass the scheduled task runs. */
export async function runDispatchPass(
	adapters: DispatchAdapters,
	config: DispatchConfig,
): Promise<DispatchPassResult> {
	const reading = await adapters.read()
	const plan = planDispatch(reading, config)
	const errors =
		config.mode === "dry-run" ? printPlan(adapters, plan) : await applyPlan(adapters, plan)
	const failed = new Set(
		errors.filter((error) => !error.launched).map((error) => keyOf(error.issue)),
	)
	const report = passReport(plan, reading, failed)
	adapters.print(formatDispatchReport(report, config.mode))
	for (const error of errors) {
		const prefix = error.launched ? "status update failed" : "launch failed"
		adapters.print(`${prefix} ${keyOf(error.issue)}: ${error.message}`)
	}
	return deepFreeze({
		plan,
		errors,
		report,
	})
}
async function applyPlan(
	adapters: DispatchAdapters,
	plan: DispatchPlan,
): Promise<readonly DispatchLaunchError[]> {
	await applyBatch(adapters, plan.writes)
	await applyBatch(adapters, plan.claims)
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
	return errors
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

import type { DispatchConfig } from "./dispatch-contracts"
import type {
	DispatchAdapters,
	DispatchLaunchError,
	DispatchPassResult,
} from "./dispatch-pass-contracts"
import { planDispatch, releaseWrites } from "./dispatch-plan"
import type { DispatchLaunch, DispatchPlan } from "./dispatch-plan-contracts"
import { formatDispatchReport, formatLaunch, passReport } from "./dispatch-report"
import { formatWrite } from "./github/format-write"
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
	const failed = new Set(errors.map((error) => keyOf(error.issue)))
	const report = passReport(plan, reading, failed)
	adapters.print(formatDispatchReport(report))
	return {
		plan,
		errors,
		report,
	}
}
function printPlan(adapters: DispatchAdapters, plan: DispatchPlan): readonly DispatchLaunchError[] {
	for (const write of [...plan.writes, ...plan.claims]) adapters.print(formatWrite(write))
	for (const launch of plan.launches) adapters.print(formatLaunch(launch))
	for (const skip of plan.skipped) adapters.print(`skip ${keyOf(skip.issue)}: ${skip.reason.code}`)
	for (const deferral of plan.deferrals) {
		adapters.print(`defer ${keyOf(deferral.issue)}: ${deferral.reason}`)
	}
	return []
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
		if (error !== undefined) errors.push(error)
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
		await adapters.launch(launch.request)
		return undefined
	} catch (error) {
		await adapters.applyWrites(releaseWrites(launch.run))
		return { issue, message: messageOf(error) }
	}
}
function messageOf(error: unknown): string {
	return error instanceof Error ? error.message : String(error)
}

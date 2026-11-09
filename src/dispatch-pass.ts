import type { DispatchConfig } from "./dispatch-contracts"
import { applyPlan } from "./dispatch-pass-apply"
import type { DispatchAdapters, DispatchPassResult } from "./dispatch-pass-contracts"
import { printPlan } from "./dispatch-pass-print"
import { planDispatch } from "./dispatch-plan"
import { formatDispatchReport, passReport } from "./dispatch-report"
import { deepFreeze } from "./freeze"
import { issueOfRun, keyOf } from "./keys"
/** The Dispatcher pass the scheduled task runs. */
export async function runDispatchPass(
	adapters: DispatchAdapters,
	config: DispatchConfig,
): Promise<DispatchPassResult> {
	const reading = await adapters.read()
	const plan = planDispatch(reading, config)
	const outcome =
		config.mode === "dry-run"
			? { errors: printPlan(adapters, plan), applied: true }
			: await applyPlan(adapters, plan)
	const failed = new Set(
		outcome.errors.filter((error) => !error.launched).map((error) => keyOf(error.issue)),
	)
	if (!outcome.applied) {
		for (const launch of plan.launches) failed.add(keyOf(issueOfRun(launch.run)))
	}
	const report = passReport(plan, reading, failed, outcome.released)
	adapters.print(formatDispatchReport(report, config.mode))
	for (const error of outcome.errors)
		adapters.print(
			`${error.launched ? "status update failed" : "launch failed"} ${keyOf(error.issue)}: ${error.message}`,
		)
	if (outcome.writeError !== undefined) adapters.print(`write failed: ${outcome.writeError}`)
	return deepFreeze({
		plan,
		errors: outcome.errors,
		report,
		...(outcome.writeError === undefined ? {} : { writeError: outcome.writeError }),
	})
}

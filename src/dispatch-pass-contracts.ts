import type { IssueKey } from "./contracts"
import type { DispatchReading } from "./dispatch-contracts"
import type { DispatchPlan, DispatchReport } from "./dispatch-plan-contracts"
import type { FactoryWrite } from "./github/writes"
import type { T3LaunchRequest, T3Thread } from "./t3"

/** The outside world one Dispatcher pass reads, writes and launches through. */
export type DispatchAdapters = {
	readonly read: () => Promise<DispatchReading>
	readonly applyWrites: (writes: readonly FactoryWrite[]) => Promise<void>
	readonly launch: (request: T3LaunchRequest, host: string) => Promise<T3Thread>
	readonly print: (line: string) => void
}
/** A Run whose launch failed after its Claim was written. */
export type DispatchLaunchError = {
	readonly issue: IssueKey
	readonly message: string
	readonly launched: boolean
}
/** The result of one Dispatcher pass. */
export type DispatchPassResult = {
	readonly plan: DispatchPlan
	readonly errors: readonly DispatchLaunchError[]
	readonly report: DispatchReport
}

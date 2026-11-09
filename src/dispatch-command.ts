import type {
	DispatchConfig,
	DispatchLedger,
	DispatchReading,
	HostSnapshot,
} from "./dispatch-contracts"
import { runDispatchPass } from "./dispatch-pass"
import type { DispatchAdapters, DispatchPassResult } from "./dispatch-pass-contracts"
import type { DispatchReport } from "./dispatch-plan-contracts"
import { formatDispatchReport, threeDayReport } from "./dispatch-report"
import type { GitHubClient } from "./github/client"
import { readRepositoryState } from "./github/read"
import type { FactoryWrite } from "./github/writes"
import type { HumanQueue } from "./human-queue"
import type { KillSwitch } from "./kill-switch"
import type { T3Client, T3LaunchRequest, T3Thread } from "./t3"
import { listLiveThreads } from "./t3-adapter"

/** What the scheduled task supplies beyond GitHub and T3: the host and owner state it measured. */
export type DispatchCommandInput = {
	readonly repositories: readonly string[]
	readonly hosts: readonly HostSnapshot[]
	readonly humanQueue: HumanQueue
	readonly killSwitch: KillSwitch
	readonly ledger: DispatchLedger
	readonly nowMs: number
	readonly applyWrites: (writes: readonly FactoryWrite[]) => Promise<void>
	readonly launch: (request: T3LaunchRequest) => Promise<T3Thread>
	readonly print: (line: string) => void
	readonly history?: readonly DispatchReport[]
}

/** The scheduled task's one Dispatcher pass. */
export async function dispatchCommand(
	client: GitHubClient,
	t3: T3Client,
	config: DispatchConfig,
	input: DispatchCommandInput,
): Promise<DispatchPassResult> {
	const state = await readRepositoryState(client, input.repositories, await listLiveThreads(t3))
	const reading: DispatchReading = {
		state,
		hosts: input.hosts,
		humanQueue: input.humanQueue,
		killSwitch: input.killSwitch,
		ledger: input.ledger,
		nowMs: input.nowMs,
	}
	const adapters: DispatchAdapters = {
		read: async () => reading,
		applyWrites: input.applyWrites,
		launch: input.launch,
		print: input.print,
	}
	const result = await runDispatchPass(adapters, config)
	if (input.history !== undefined) {
		const history = [...input.history, result.report]
		input.print(formatDispatchReport(threeDayReport(history, input.ledger, input.nowMs)))
	}
	return result
}

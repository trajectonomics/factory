import type {
	DispatchConfig,
	DispatchLedger,
	DispatchReading,
	HostSnapshot,
} from "./dispatch-contracts"
import { runDispatchPass } from "./dispatch-pass"
import type { DispatchAdapters, DispatchPassResult } from "./dispatch-pass-contracts"
import type { GitHubClient } from "./github/client"
import { readRepositoryState } from "./github/read"
import { readRepositorySkills } from "./github/read-skills"
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
	/** The skills installed per repository; read from GitHub when the caller supplies none. */
	readonly skills?: Readonly<Record<string, readonly string[]>>
	readonly nowMs: number
	readonly applyWrites: (writes: readonly FactoryWrite[]) => Promise<void>
	readonly launch: (request: T3LaunchRequest, host: string) => Promise<T3Thread>
	readonly print: (line: string) => void
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
		skills: input.skills ?? (await readRepositorySkills(client, input.repositories)),
		nowMs: input.nowMs,
	}
	const adapters: DispatchAdapters = {
		read: async () => reading,
		applyWrites: input.applyWrites,
		launch: input.launch,
		print: input.print,
	}
	return runDispatchPass(adapters, config)
}

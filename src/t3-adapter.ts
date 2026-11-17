import type { HostThreads } from "./dispatch-contracts"
import { deepFreeze } from "./freeze"
import { type RunLaunchInput, runLaunchRequest } from "./run-launch"
import type { T3Client, T3LaunchRequest, T3Thread } from "./t3"

/** Whether a launch is applied to T3 or only planned. */
export type LaunchMode = "live" | "dry-run"

/** One host's T3 client, as the caller supplies it; one source lists every project on that host. */
export type HostThreadSource = {
	readonly host: string
	readonly environmentId: string
	readonly client: T3Client
}

/** The launch of a Run thread, or its plan in a dry run. */
export type RunLaunchOutcome =
	| { readonly kind: "launched"; readonly request: T3LaunchRequest; readonly thread: T3Thread }
	| { readonly kind: "dry-run"; readonly request: T3LaunchRequest }

/** Every host's live threads as one pass read them; a read that fails is unread, never empty. */
export async function readThreadInventories(
	sources: readonly HostThreadSource[],
): Promise<readonly HostThreads[]> {
	const inventory: HostThreads[] = []
	for (const source of sources) inventory.push(await readHostThreads(source))
	return Object.freeze(inventory)
}

/** The outcome of launching a Run thread, or of planning one in a dry run. */
export async function launchRun(
	client: T3Client,
	input: RunLaunchInput,
	mode: LaunchMode,
): Promise<RunLaunchOutcome> {
	const request = runLaunchRequest(input)
	if (mode === "dry-run") return deepFreeze({ kind: "dry-run", request })
	const thread = await client.launchThread(request)
	return deepFreeze({ kind: "launched", request, thread: copyThread(thread) })
}

async function readHostThreads(source: HostThreadSource): Promise<HostThreads> {
	try {
		const threads = await source.client.listThreads()
		return Object.freeze({
			host: source.host,
			environmentId: source.environmentId,
			ok: true,
			threads: Object.freeze([...threads]),
		})
	} catch (error) {
		return Object.freeze({
			host: source.host,
			environmentId: source.environmentId,
			ok: false,
			threads: Object.freeze([]),
			error: error instanceof Error ? error.message : String(error),
		})
	}
}

function copyThread(thread: T3Thread): T3Thread {
	return thread.branch === undefined
		? { id: thread.id, title: thread.title, status: thread.status }
		: { id: thread.id, title: thread.title, status: thread.status, branch: thread.branch }
}

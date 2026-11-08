import type { IssueKey } from "./contracts"
import { deepFreeze } from "./freeze"
import { type RunLaunchInput, runLaunchRequest } from "./run-launch"
import type { T3Client, T3LaunchRequest, T3Thread } from "./t3"
import { liveThreadIssues } from "./t3-threads"

/** Whether a launch is applied to T3 or only planned. */
export type LaunchMode = "live" | "dry-run"

/** The launch of a Run thread, or its plan in a dry run. */
export type RunLaunchOutcome =
	| { readonly kind: "launched"; readonly request: T3LaunchRequest; readonly thread: T3Thread }
	| { readonly kind: "dry-run"; readonly request: T3LaunchRequest }

/** The issues behind the live T3 threads, for matching against Claims. */
export async function listLiveThreads(client: T3Client): Promise<readonly IssueKey[]> {
	return liveThreadIssues(await client.listThreads())
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

function copyThread(thread: T3Thread): T3Thread {
	return thread.branch === undefined
		? { id: thread.id, title: thread.title, status: thread.status }
		: { id: thread.id, title: thread.title, status: thread.status, branch: thread.branch }
}

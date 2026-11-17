import type { DispatchCommandInput } from "../dispatch-command"
import type { GitHubIssueData } from "../github/client"
import type { T3Client, T3Thread } from "../t3"
import type { HostThreadSource } from "../t3-adapter"
import { host, NOW_MS } from "./dispatch"

/** An approved Ticket in the CLI repository, as the command reads it. */
export const COMMAND_ISSUE: GitHubIssueData = {
	number: 4,
	title: "Dispatcher entrypoint",
	state: "open",
	labels: [{ name: "ready-for-agent" }],
	repository_url: "https://api.github.com/repos/trajectonomics/cli",
}
/** The thread a launch answers with. */
export const COMMAND_THREAD: T3Thread = {
	id: "thread-cli-4",
	title: "traj/trajectonomics/cli#4",
	status: "queued",
	branch: "factory/4-dispatcher-entrypoint",
}
/** A pass that reads no live thread. */
export function quietClient(): T3Client {
	return { listThreads: async () => [], launchThread: async () => COMMAND_THREAD }
}
/** One host's T3 client, as the command input supplies it. */
export function commandSource(hostName: string, client: T3Client): HostThreadSource {
	return { host: hostName, environmentId: `environment-${hostName}`, client }
}
/** A command input for one homeserver2 source, with the test's own parts overridden. */
export function commandInput(
	client: T3Client,
	overrides: Partial<DispatchCommandInput> = {},
): DispatchCommandInput {
	return {
		repositories: ["trajectonomics/cli"],
		hosts: [host()],
		threadSources: [commandSource("homeserver2", client)],
		humanQueue: { openPullRequests: 0, needsSpecReview: 0, readyForHuman: 0 },
		killSwitch: { scheduleEnabled: true, pausedRepositories: [] },
		nowMs: NOW_MS,
		applyWrites: async () => {},
		launch: async () => COMMAND_THREAD,
		print: () => {},
		...overrides,
	}
}

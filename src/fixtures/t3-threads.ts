import type { T3Thread } from "../t3"

/** A recorded T3 thread listing: live Runs, a settled Run and a foreign thread. */
export const RECORDED_THREADS: readonly T3Thread[] = [
	{
		id: "thread-factory-8",
		title: "traj/trajectonomics/factory#8",
		status: "running",
		branch: "factory/8-t3-adapter",
	},
	{
		id: "thread-cli-9",
		title: "traj/trajectonomics/cli#9",
		status: "waiting",
		branch: "factory/9-add-json-output",
	},
	{
		id: "thread-factory-7",
		title: "traj/trajectonomics/factory#7",
		status: "completed",
		branch: "factory/7-github-adapter",
	},
	{ id: "thread-notes", title: "Planning notes", status: "running" },
]

/** A recorded T3 response to the launch of the T3 adapter Run. */
export const RECORDED_LAUNCHED_THREAD: T3Thread = {
	id: "thread-factory-8",
	title: "traj/trajectonomics/factory#8",
	status: "queued",
	branch: "factory/8-t3-adapter",
}

import { describe, expect, it } from "bun:test"
import { dispatchCommand } from "./dispatch-command"
import { config, FACTORY, host, matchingLock } from "./fixtures/dispatch"
import {
	COMMAND_ISSUE,
	COMMAND_THREAD,
	commandInput,
	commandSource,
	quietClient,
} from "./fixtures/dispatch-command"
import { testClient } from "./github/fixtures/test-client"
import type { T3Client, T3Thread } from "./t3"

const CLI = "trajectonomics/cli"
const ALL = ["implement", "tdd", "code-review"]
const FACTORY_ISSUE = {
	...COMMAND_ISSUE,
	number: 5,
	repository_url: `https://api.github.com/repos/${FACTORY}`,
}
const CLI_ISSUE = { repository: CLI, number: 4 }
const FACTORY_KEY = { repository: FACTORY, number: 5 }

function countingClient(threads: readonly T3Thread[]): {
	readonly client: T3Client
	readonly reads: () => number
} {
	let reads = 0
	return {
		reads: () => reads,
		client: {
			listThreads: async () => {
				reads += 1
				return threads
			},
			launchThread: async () => COMMAND_THREAD,
		},
	}
}

describe("a pass over every host", () => {
	it("reads each host once and derives the live-issue set from both", async () => {
		const two = countingClient([{ id: "t1", title: `traj/${CLI}#4`, status: "running" }])
		const one = countingClient([{ id: "t2", title: `traj/${FACTORY}#5`, status: "waiting" }])
		const client = testClient({ listIssues: async () => [COMMAND_ISSUE, FACTORY_ISSUE] })

		const result = await dispatchCommand(
			client,
			config(),
			commandInput(two.client, {
				hosts: [host(), host({ host: "homeserver1" })],
				threadSources: [
					commandSource("homeserver2", two.client),
					commandSource("homeserver1", one.client),
				],
				skills: { [CLI]: ALL, [FACTORY]: ALL },
				skillLocks: { [CLI]: matchingLock(), [FACTORY]: matchingLock() },
			}),
		)

		expect(result.plan.skipped).toEqual([
			{ issue: CLI_ISSUE, reason: { code: "live-thread" } },
			{ issue: FACTORY_KEY, reason: { code: "live-thread" } },
		])
		expect(two.reads()).toBe(1)
		expect(one.reads()).toBe(1)
	})

	it("records a host it could not read and defers the repositories it carries", async () => {
		const failing: T3Client = {
			listThreads: async () => {
				throw new Error("connection refused")
			},
			launchThread: async () => COMMAND_THREAD,
		}
		const client = testClient({ listIssues: async () => [FACTORY_ISSUE] })

		const result = await dispatchCommand(
			client,
			config(),
			commandInput(failing, {
				hosts: [host(), host({ host: "homeserver1", repositories: [FACTORY] })],
				threadSources: [
					commandSource("homeserver2", failing),
					commandSource("homeserver1", quietClient()),
				],
				skills: { [FACTORY]: ALL },
				skillLocks: { [FACTORY]: matchingLock() },
			}),
		)

		expect(result.plan.deferrals).toEqual([{ issue: FACTORY_KEY, reason: "host-unread" }])
		expect(result.report.unreadHosts).toEqual([{ host: "homeserver2", repositoriesAtRisk: 2 }])
		expect(result.report.runs).toEqual([])
	})
})

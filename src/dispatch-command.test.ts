import { describe, expect, it } from "bun:test"
import { dispatchCommand } from "./dispatch-command"
import { config, matchingLock } from "./fixtures/dispatch"
import {
	COMMAND_ISSUE,
	COMMAND_THREAD,
	commandInput,
	quietClient,
} from "./fixtures/dispatch-command"
import { testClient } from "./github/fixtures/test-client"
import type { FactoryWrite } from "./github/writes"

const ALL = ["implement", "tdd", "code-review"]
const NO_LEDGER = { pullRequests: [], exits: [] } as const

describe("the Dispatcher command", () => {
	it("reads GitHub and T3 state and launches the eligible Run", async () => {
		let launches = 0
		const writes: FactoryWrite[][] = []
		const client = testClient({
			listIssues: async () => [COMMAND_ISSUE],
			listSkills: async () => ALL,
			readSkillLock: async () => matchingLock(),
		})

		const result = await dispatchCommand(
			client,
			config(),
			commandInput(quietClient(), {
				ledger: NO_LEDGER,
				applyWrites: async (batch) => {
					writes.push([...batch])
				},
				launch: async () => {
					launches += 1
					return COMMAND_THREAD
				},
			}),
		)

		expect(result.report.runs).toHaveLength(1)
		expect(launches).toBe(1)
		expect(writes).toHaveLength(2)
	})

	it("reads the ledger itself when the caller supplies none", async () => {
		const draft = {
			number: 9,
			draft: true,
			created_at: "2026-11-09T10:00:00Z",
			head: { ref: "factory/4-dispatcher-entrypoint" },
		}
		const client = testClient({
			listPullRequests: async () => [draft],
			readSkillLock: async () => matchingLock(),
		})

		const result = await dispatchCommand(client, config(), commandInput(quietClient()))

		expect(result.report.pullRequests).toHaveLength(1)
		expect(result.report.gateFailures).toHaveLength(1)
	})

	it("reads every repository's lock when the caller supplies none", async () => {
		const read: string[] = []
		const client = testClient({
			listIssues: async () => [COMMAND_ISSUE],
			listSkills: async () => ALL,
			readSkillLock: async (repository) => {
				read.push(repository)
				return matchingLock()
			},
		})

		const result = await dispatchCommand(
			client,
			config(),
			commandInput(quietClient(), { ledger: NO_LEDGER }),
		)

		expect(read).toEqual(["trajectonomics/cli"])
		expect(result.report.runs).toHaveLength(1)
	})

	it("passes caller-supplied locks through without reading GitHub", async () => {
		const client = testClient({
			listIssues: async () => [COMMAND_ISSUE],
			listSkills: async () => ALL,
		})

		const result = await dispatchCommand(
			client,
			config(),
			commandInput(quietClient(), {
				ledger: NO_LEDGER,
				skillLocks: { "trajectonomics/cli": matchingLock() },
			}),
		)

		expect(result.report.runs).toHaveLength(1)
	})
})

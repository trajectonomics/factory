import { describe, expect, it } from "bun:test"
import { dispatchCommand } from "./dispatch-command"
import { config, host, matchingLock, NOW_MS } from "./fixtures/dispatch"
import type { GitHubIssueData } from "./github/client"
import { testClient } from "./github/fixtures/test-client"
import type { FactoryWrite } from "./github/writes"
import type { T3Client, T3Thread } from "./t3"

const ISSUE: GitHubIssueData = {
	number: 4,
	title: "Dispatcher entrypoint",
	state: "open",
	labels: [{ name: "ready-for-agent" }],
	repository_url: "https://api.github.com/repos/trajectonomics/cli",
}
const THREAD: T3Thread = {
	id: "thread-cli-4",
	title: "traj/trajectonomics/cli#4",
	status: "queued",
	branch: "factory/4-dispatcher-entrypoint",
}
const ALL = ["implement", "tdd", "code-review"]

describe("the Dispatcher command", () => {
	it("reads GitHub and T3 state and launches the eligible Run", async () => {
		let launches = 0
		const writes: FactoryWrite[][] = []
		const client = testClient({
			listIssues: async () => [ISSUE],
			listSkills: async () => ALL,
			readSkillLock: async () => matchingLock(),
		})
		const t3: T3Client = {
			listThreads: async () => [],
			launchThread: async () => THREAD,
		}

		const result = await dispatchCommand(client, t3, config(), {
			repositories: ["trajectonomics/cli"],
			hosts: [host()],
			humanQueue: { openPullRequests: 0, needsSpecReview: 0, readyForHuman: 0 },
			killSwitch: { scheduleEnabled: true, pausedRepositories: [] },
			ledger: { pullRequests: [], exits: [] },
			nowMs: NOW_MS,
			applyWrites: async (batch) => {
				writes.push([...batch])
			},
			launch: async () => {
				launches += 1
				return THREAD
			},
			print: () => {},
		})

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
		const t3: T3Client = { listThreads: async () => [], launchThread: async () => THREAD }

		const result = await dispatchCommand(client, t3, config(), {
			repositories: ["trajectonomics/cli"],
			hosts: [host()],
			humanQueue: { openPullRequests: 0, needsSpecReview: 0, readyForHuman: 0 },
			killSwitch: { scheduleEnabled: true, pausedRepositories: [] },
			nowMs: NOW_MS,
			applyWrites: async () => {},
			launch: async () => THREAD,
			print: () => {},
		})

		expect(result.report.pullRequests).toHaveLength(1)
		expect(result.report.gateFailures).toHaveLength(1)
	})

	it("reads every repository's lock when the caller supplies none", async () => {
		const read: string[] = []
		const client = testClient({
			listIssues: async () => [ISSUE],
			listSkills: async () => ALL,
			readSkillLock: async (repository) => {
				read.push(repository)
				return matchingLock()
			},
		})
		const t3: T3Client = { listThreads: async () => [], launchThread: async () => THREAD }

		const result = await dispatchCommand(client, t3, config(), {
			repositories: ["trajectonomics/cli"],
			hosts: [host()],
			humanQueue: { openPullRequests: 0, needsSpecReview: 0, readyForHuman: 0 },
			killSwitch: { scheduleEnabled: true, pausedRepositories: [] },
			ledger: { pullRequests: [], exits: [] },
			nowMs: NOW_MS,
			applyWrites: async () => {},
			launch: async () => THREAD,
			print: () => {},
		})

		expect(read).toEqual(["trajectonomics/cli"])
		expect(result.report.runs).toHaveLength(1)
	})

	it("passes caller-supplied locks through without reading GitHub", async () => {
		const client = testClient({
			listIssues: async () => [ISSUE],
			listSkills: async () => ALL,
		})
		const t3: T3Client = { listThreads: async () => [], launchThread: async () => THREAD }

		const result = await dispatchCommand(client, t3, config(), {
			repositories: ["trajectonomics/cli"],
			hosts: [host()],
			humanQueue: { openPullRequests: 0, needsSpecReview: 0, readyForHuman: 0 },
			killSwitch: { scheduleEnabled: true, pausedRepositories: [] },
			ledger: { pullRequests: [], exits: [] },
			skillLocks: { "trajectonomics/cli": matchingLock() },
			nowMs: NOW_MS,
			applyWrites: async () => {},
			launch: async () => THREAD,
			print: () => {},
		})

		expect(result.report.runs).toHaveLength(1)
	})
})

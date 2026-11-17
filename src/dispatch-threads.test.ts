import { describe, expect, it } from "bun:test"
import { atRiskRepositories, liveCountOf, liveThreadIssues, unreadHosts } from "./dispatch-threads"
import { CLI, FACTORY, host, hostThreads, thread } from "./fixtures/dispatch"
import { T3Error } from "./t3-errors"

const CLI_ISSUE = { repository: CLI, number: 9 }
const FACTORY_ISSUE = { repository: FACTORY, number: 8 }

function t3Error(run: () => void): T3Error | undefined {
	try {
		run()
	} catch (error) {
		return error instanceof T3Error ? error : undefined
	}
	return undefined
}

describe("the live-thread set", () => {
	it("names the issue of a live thread on every host that was read, once each in issue order", () => {
		const inventory = [
			hostThreads({ threads: [thread({ title: "traj/trajectonomics/factory#8" })] }),
			hostThreads({
				host: "homeserver1",
				environmentId: "environment-homeserver1",
				threads: [
					thread({ title: "traj/trajectonomics/cli#9" }),
					thread({ id: "thread-2", title: "traj/trajectonomics/factory#8" }),
				],
			}),
		]

		expect(liveThreadIssues(inventory)).toEqual([CLI_ISSUE, FACTORY_ISSUE])
	})

	it("names the issue of a live draft or screening thread", () => {
		const inventory = [
			hostThreads({
				threads: [
					thread({ title: "triage/trajectonomics/cli#9" }),
					thread({ id: "thread-2", title: "screen/trajectonomics/factory#8" }),
				],
			}),
		]

		expect(liveThreadIssues(inventory)).toEqual([CLI_ISSUE, FACTORY_ISSUE])
	})

	it("names no issue for a live assistant thread, which names none", () => {
		const inventory = [
			hostThreads({ threads: [thread({ title: "assist/growth-g1", status: "running" })] }),
		]

		expect(liveThreadIssues(inventory)).toEqual([])
	})

	it("names nothing from a host that was not read", () => {
		const inventory = [hostThreads({ ok: false, error: "connection refused", threads: [thread()] })]

		expect(liveThreadIssues(inventory)).toEqual([])
	})

	it("names nothing for a settled thread", () => {
		const inventory = [hostThreads({ threads: [thread({ status: "completed" })] })]

		expect(liveThreadIssues(inventory)).toEqual([])
	})

	it("fails closed on an unsafe issue number in a live Run thread title", () => {
		const inventory = [
			hostThreads({ threads: [thread({ title: "traj/trajectonomics/cli#99999999999999999999" })] }),
		]

		expect(t3Error(() => liveThreadIssues(inventory))?.code).toBe("unsafe-issue-number")
	})
})

describe("a host's live-thread count", () => {
	it("counts every live thread on the host under the seven live prefixes", () => {
		const inventory = [
			hostThreads({
				threads: [
					thread(),
					thread({ id: "thread-2", title: "triage/trajectonomics/cli#10" }),
					thread({ id: "thread-3", title: "assist/growth-g1" }),
				],
			}),
		]

		expect(liveCountOf(inventory, "homeserver2")).toBe(3)
	})

	it("counts no settled thread", () => {
		const inventory = [
			hostThreads({
				threads: [thread({ status: "completed" }), thread({ id: "thread-2", status: "idle" })],
			}),
		]

		expect(liveCountOf(inventory, "homeserver2")).toBe(0)
	})

	it("counts no title outside the live prefixes", () => {
		const inventory = [hostThreads({ threads: [thread({ title: "T3 adapter" })] })]

		expect(liveCountOf(inventory, "homeserver2")).toBe(0)
	})

	it("has no count for a host that was not read", () => {
		const inventory = [hostThreads({ ok: false, threads: [] })]

		expect(liveCountOf(inventory, "homeserver2")).toBeUndefined()
	})

	it("has no count for a host the reading does not name", () => {
		expect(liveCountOf([], "homeserver1")).toBeUndefined()
	})
})

describe("a host that was not read", () => {
	const hosts = [host(), host({ host: "homeserver1" })]

	it("is named when its reading failed or is missing", () => {
		expect(unreadHosts({ hosts, threads: [hostThreads()] }).map((entry) => entry.host)).toEqual([
			"homeserver1",
		])
		expect(
			unreadHosts({
				hosts,
				threads: [hostThreads(), hostThreads({ host: "homeserver1", ok: false })],
			}).map((entry) => entry.host),
		).toEqual(["homeserver1"])
	})

	it("is named when its snapshot says it is unreachable, even if a reading exists", () => {
		const reached = host({ host: "homeserver1", reachable: false })

		expect(
			unreadHosts({
				hosts: [host(), reached],
				threads: [hostThreads(), hostThreads({ host: "homeserver1" })],
			}).map((entry) => entry.host),
		).toEqual(["homeserver1"])
	})

	it("makes the repositories it carries at risk on every host", () => {
		expect([
			...atRiskRepositories({
				hosts: [host(), host({ host: "homeserver1", repositories: [FACTORY] })],
				threads: [hostThreads(), hostThreads({ host: "homeserver1", ok: false })],
			}),
		]).toEqual([FACTORY])
	})

	it("makes no repository at risk when every host was read", () => {
		expect([
			...atRiskRepositories({
				hosts,
				threads: [hostThreads(), hostThreads({ host: "homeserver1" })],
			}),
		]).toEqual([])
	})
})

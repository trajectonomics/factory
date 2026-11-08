import { describe, expect, it } from "bun:test"
import type { IssueKey } from "./contracts"
import type { T3Thread } from "./t3"
import { issueFromThreadTitle, liveThreadIssues, threadTitleOf } from "./t3-threads"

const FACTORY: IssueKey = { repository: "trajectonomics/factory", number: 8 }

function thread(overrides: Partial<T3Thread> = {}): T3Thread {
	return {
		id: "thread-1",
		title: "traj/trajectonomics/factory#8",
		status: "running",
		...overrides,
	}
}

describe("Run thread titles", () => {
	it("names a Run thread after its issue", () => {
		expect(threadTitleOf(FACTORY)).toBe("traj/trajectonomics/factory#8")
	})

	it("reads the issue a Run thread title names", () => {
		expect(issueFromThreadTitle("traj/trajectonomics/factory#8")).toEqual(FACTORY)
	})

	it("ignores a title that is not a Run thread", () => {
		expect(issueFromThreadTitle("factory/8-t3-adapter")).toBeUndefined()
	})

	it("ignores a Run thread title without an issue number", () => {
		expect(issueFromThreadTitle("traj/trajectonomics/factory")).toBeUndefined()
	})

	it("ignores a Run thread title without a repository", () => {
		expect(issueFromThreadTitle("traj/#8")).toBeUndefined()
	})

	it("ignores a title with more than one repository separator", () => {
		expect(issueFromThreadTitle("traj/trajectonomics/factory/extra#8")).toBeUndefined()
	})
})

describe("live Run threads", () => {
	it("lists the issue behind a running Run thread", () => {
		expect(liveThreadIssues([thread()])).toEqual([FACTORY])
	})

	it("lists a waiting Run thread", () => {
		expect(liveThreadIssues([thread({ status: "waiting" })])).toEqual([FACTORY])
	})

	it("ignores a settled Run thread", () => {
		expect(liveThreadIssues([thread({ status: "completed" })])).toEqual([])
	})

	it("ignores an idle thread", () => {
		expect(liveThreadIssues([thread({ status: "idle" })])).toEqual([])
	})

	it("ignores a thread titled outside the Run namespace", () => {
		expect(liveThreadIssues([thread({ title: "T3 adapter" })])).toEqual([])
	})

	it("lists one issue once for duplicate live threads", () => {
		expect(liveThreadIssues([thread(), thread({ id: "thread-2" })])).toEqual([FACTORY])
	})

	it("lists live threads in issue order", () => {
		const cli = { repository: "trajectonomics/cli", number: 9 }
		const threads = [
			thread({ id: "cli", title: threadTitleOf(cli) }),
			thread({ id: "factory", title: threadTitleOf(FACTORY) }),
		]

		expect(liveThreadIssues(threads)).toEqual([cli, FACTORY])
	})
})

import { describe, expect, it } from "bun:test"
import type { IssueKey } from "./contracts"
import { T3Error } from "./t3-errors"
import { isLiveThreadTitle, liveThreadIssue, runThreadIssue, threadTitleOf } from "./t3-threads"

const FACTORY: IssueKey = { repository: "trajectonomics/factory", number: 8 }

function t3Error(run: () => void): T3Error | undefined {
	try {
		run()
	} catch (error) {
		return error instanceof T3Error ? error : undefined
	}
	return undefined
}

describe("Run thread titles", () => {
	it("names a Run thread after its issue", () => {
		expect(threadTitleOf(FACTORY)).toBe("traj/trajectonomics/factory#8")
	})

	it("reads the issue a Run thread title names", () => {
		expect(runThreadIssue("traj/trajectonomics/factory#8")).toEqual(FACTORY)
	})

	it("ignores a title that is not a Run thread", () => {
		expect(runThreadIssue("factory/8-t3-adapter")).toBeUndefined()
	})

	it("ignores a Run thread title without an issue number", () => {
		expect(runThreadIssue("traj/trajectonomics/factory")).toBeUndefined()
	})

	it("ignores a Run thread title without a repository", () => {
		expect(runThreadIssue("traj/#8")).toBeUndefined()
	})

	it("ignores a title with more than one repository separator", () => {
		expect(runThreadIssue("traj/trajectonomics/factory/extra#8")).toBeUndefined()
	})

	it("rejects an issue number that is not a safe integer", () => {
		const error = t3Error(() => runThreadIssue("traj/trajectonomics/factory#99999999999999999999"))

		expect(error?.code).toBe("unsafe-issue-number")
		expect(error?.field).toBe("title")
	})
})

describe("live thread titles", () => {
	it("reads the issue a draft thread title names", () => {
		expect(liveThreadIssue("triage/trajectonomics/cli#6")).toEqual({
			repository: "trajectonomics/cli",
			number: 6,
		})
	})

	it("keeps the Run parse to the traj namespace", () => {
		expect(runThreadIssue("triage/trajectonomics/cli#6")).toBeUndefined()
	})

	it("ignores a live thread title that names no issue", () => {
		expect(liveThreadIssue("assist/growth-g1")).toBeUndefined()
	})

	it("rejects an unsafe issue number in a live thread title", () => {
		const error = t3Error(() => liveThreadIssue("qa/trajectonomics/docs#99999999999999999999"))

		expect(error?.code).toBe("unsafe-issue-number")
	})

	it.each([
		"traj/trajectonomics/cli#9",
		"triage/trajectonomics/cli#9",
		"screen/trajectonomics/cli#9",
		"qa/docs",
		"idea/growth",
		"learn/factory",
		"assist/growth-g1",
	])("counts %s as a live thread title", (title) => {
		expect(isLiveThreadTitle(title)).toBe(true)
	})

	it("counts no title outside the live prefixes", () => {
		expect(isLiveThreadTitle("factory/8-t3-adapter")).toBe(false)
	})
})

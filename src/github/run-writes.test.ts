import { describe, expect, it } from "bun:test"
import type { IssueKey } from "../contracts"
import type { CreatePullRequestRequest } from "./create"
import { followUpWrite, pullRequestWrite } from "./run-writes"

const ISSUE: IssueKey = { repository: "trajectonomics/factory", number: 9 }
const REQUEST: CreatePullRequestRequest = {
	repository: ISSUE.repository,
	title: "Ticket Run end to end",
	body: "Closes #9",
	head: "factory/9-ticket-run-end-to-end",
	base: "main",
	draft: false,
	labels: ["factory"],
}

describe("run writes", () => {
	it("freezes a pull request write and copies the caller's values", () => {
		const write = pullRequestWrite(ISSUE, REQUEST)

		expect(Object.isFrozen(write)).toBe(true)
		expect(Object.isFrozen(write.labels)).toBe(true)
		expect(write.issue).not.toBe(ISSUE)
		expect(write.labels).not.toBe(REQUEST.labels)
		expect(Object.isFrozen(REQUEST)).toBe(false)
		expect(Object.isFrozen(REQUEST.labels)).toBe(false)
	})

	it("labels every Follow-up Ticket ready-for-human", () => {
		const write = followUpWrite(ISSUE, {
			title: "Provision the release token",
			body: "Only the owner can create it.",
		})

		expect(write.labels).toEqual(["ready-for-human"])
		expect(Object.isFrozen(write)).toBe(true)
	})
})

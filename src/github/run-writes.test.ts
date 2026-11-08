import { describe, expect, it } from "bun:test"
import type { IssueKey } from "../contracts"
import type { CreatePullRequestRequest } from "./create"
import { GitHubAdapterError } from "./errors"
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

function errorOf(run: () => unknown): GitHubAdapterError | undefined {
	try {
		run()
	} catch (error) {
		return error instanceof GitHubAdapterError ? error : undefined
	}
	return undefined
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
	it("rejects a pull request without a title, head branch or base branch", () => {
		const title = errorOf(() => pullRequestWrite(ISSUE, { ...REQUEST, title: " " }))
		const head = errorOf(() => pullRequestWrite(ISSUE, { ...REQUEST, head: "" }))
		const base = errorOf(() => pullRequestWrite(ISSUE, { ...REQUEST, base: "" }))

		expect(title?.code).toBe("empty-pull-request-title")
		expect(title?.field).toBe("request.title")
		expect(head?.code).toBe("empty-pull-request-head")
		expect(head?.field).toBe("request.head")
		expect(base?.code).toBe("empty-pull-request-base")
		expect(base?.field).toBe("request.base")
	})

	it("rejects a Follow-up Ticket without a title or body", () => {
		const title = errorOf(() => followUpWrite(ISSUE, { title: "", body: "Why." }))
		const body = errorOf(() => followUpWrite(ISSUE, { title: "Title", body: " " }))

		expect(title?.code).toBe("empty-follow-up-title")
		expect(title?.field).toBe("followUp.title")
		expect(body?.code).toBe("empty-follow-up-body")
		expect(body?.field).toBe("followUp.body")
	})
})

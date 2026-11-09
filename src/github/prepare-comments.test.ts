import { describe, expect, it } from "bun:test"
import type { IssueKey } from "../contracts"
import type { GitHubCommentData } from "./client"
import { testClient } from "./fixtures/test-client"
import { prepareComments } from "./prepare-comments"
import { commentWrite } from "./writes"

const ISSUE: IssueKey = { repository: "trajectonomics/factory", number: 7 }

function posted(authorAssociation?: string): GitHubCommentData {
	const write = commentWrite(ISSUE, "exit:spec-gap", "A question.")
	return authorAssociation === undefined
		? { id: 1, body: write.body }
		: { id: 1, body: write.body, author_association: authorAssociation }
}

describe("reading which comments were already posted", () => {
	it("counts a trusted author's marked comment as posted", async () => {
		const client = testClient({ listComments: async () => [posted("OWNER")] })

		const result = await prepareComments(client, [
			commentWrite(ISSUE, "exit:spec-gap", "A question."),
		])

		expect(result.get(0)).toBe(true)
	})

	it("does not let a stranger's copy of the marker suppress the Factory's comment", async () => {
		const client = testClient({ listComments: async () => [posted("NONE")] })

		const result = await prepareComments(client, [
			commentWrite(ISSUE, "exit:spec-gap", "A question."),
		])

		expect(result.get(0)).toBe(false)
	})

	it("does not trust a comment that reports no association", async () => {
		const client = testClient({ listComments: async () => [posted()] })

		const result = await prepareComments(client, [
			commentWrite(ISSUE, "exit:spec-gap", "A question."),
		])

		expect(result.get(0)).toBe(false)
	})

	it("posts the same issue and key only once within one batch", async () => {
		const write = commentWrite(ISSUE, "exit:spec-gap", "A question.")

		const result = await prepareComments(testClient(), [write, write])

		expect([result.get(0), result.get(1)]).toEqual([false, true])
	})

	it("keeps the same key on another issue separate", async () => {
		const other = { ...ISSUE, number: 8 }

		const result = await prepareComments(testClient(), [
			commentWrite(ISSUE, "exit:spec-gap", "A question."),
			commentWrite(other, "exit:spec-gap", "A question."),
		])

		expect([result.get(0), result.get(1)]).toEqual([false, false])
	})
})

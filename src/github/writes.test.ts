import { describe, expect, it } from "bun:test"
import type { IssueKey } from "../contracts"
import { GitHubAdapterError } from "./errors"
import { AI_DISCLAIMER, claimWrite, commentWrite } from "./writes"

const FACTORY = "trajectonomics/factory"

function key(number = 7): IssueKey {
	return { repository: FACTORY, number }
}

function thrown(run: () => unknown): GitHubAdapterError | undefined {
	try {
		run()
	} catch (error) {
		return error instanceof GitHubAdapterError ? error : undefined
	}
	return undefined
}

describe("Factory writes", () => {
	it("prefixes every comment with the AI disclaimer and a stable idempotency marker", () => {
		const write = commentWrite(key(), "exit:spec-gap", "  A question for the owner.  ")

		expect(write.body.startsWith(AI_DISCLAIMER)).toBe(true)
		expect(write.body).toContain("A question for the owner.")
		expect(write.body).toContain("<!-- factory:comment:exit:spec-gap -->")
		expect(Object.isFrozen(write)).toBe(true)
	})

	it("rejects a comment key that cannot be used as an idempotency marker", () => {
		const error = thrown(() => commentWrite(key(), "bad key", "body"))

		expect(error?.code).toBe("invalid-comment-key")
	})

	it("rejects a Claim time that is not a valid instant", () => {
		const error = thrown(() => claimWrite(key(), Number.NaN))

		expect(error?.code).toBe("invalid-claim-time")
	})
})

import { describe, expect, it } from "bun:test"
import type { IssueKey } from "../contracts"
import { applyWrites } from "./apply"
import type { Board } from "./board"
import { adapterError, testClient } from "./fixtures/test-client"
import { AI_DISCLAIMER, type FactoryWrite, statusWrite } from "./writes"

const FACTORY = "trajectonomics/factory"
const BOARD: Board = {
	projectId: "PVT_kwDOFOg3Is4Bpqr_",
	statusFieldId: "PVTSSF_lADOFOg3Is4Bpqr_zhoFPn0",
	statusOptionIds: {
		"In progress": "47fc9ee4",
		"In review": "df73e18b",
		Done: "98236657",
	},
	itemIds: { "trajectonomics/factory#7": "PVTI_lADOFOg3Is4Bpqr_zhG7-Ac" },
}
const VALIDATE_ONLY = { dryRun: true, print: () => {} } as const

function key(number = 7): IssueKey {
	return { repository: FACTORY, number }
}

async function rejection(write: FactoryWrite): Promise<string | undefined> {
	const error = adapterError(
		await applyWrites(testClient(), BOARD, [write], VALIDATE_ONLY).catch(
			(caught: unknown) => caught,
		),
	)
	return error?.code
}

describe("validating Factory writes", () => {
	it("rejects a comment that does not open with the AI disclaimer", async () => {
		const code = await rejection({
			kind: "comment",
			issue: key(),
			key: "exit:spec-gap",
			body: "A bare comment.",
		})

		expect(code).toBe("comment-missing-disclaimer")
	})

	it("rejects a comment without its idempotency marker", async () => {
		const code = await rejection({
			kind: "comment",
			issue: key(),
			key: "exit:spec-gap",
			body: `${AI_DISCLAIMER}\n\nA bare comment.`,
		})

		expect(code).toBe("comment-missing-marker")
	})

	it("rejects a Status write for an issue that is not on the board", async () => {
		const board: Board = { ...BOARD, itemIds: {} }
		const error = adapterError(
			await applyWrites(testClient(), board, [statusWrite(key(), "Done")], VALIDATE_ONLY).catch(
				(caught: unknown) => caught,
			),
		)

		expect(error?.code).toBe("issue-not-on-board")
		expect(error?.field).toBe("writes[0].issue")
	})

	it("rejects a Claim time that is not a non-negative integer", async () => {
		const code = await rejection({ kind: "claim", issue: key(), claimedAtMs: Number.NaN })

		expect(code).toBe("invalid-claim-time")
	})
})

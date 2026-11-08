import { describe, expect, it } from "bun:test"
import type { IssueKey } from "../contracts"
import { applyWrites } from "./apply"
import type { Board } from "./board"
import type { GitHubClient, GitHubCommentData } from "./client"
import { GitHubAdapterError } from "./errors"
import {
	AI_DISCLAIMER,
	claimWrite,
	commentWrite,
	type FactoryWrite,
	labelWrite,
	statusWrite,
} from "./writes"

const FACTORY = "trajectonomics/factory"
const CLAIMED_AT_MS = 1794136657000
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

function key(number = 7): IssueKey {
	return { repository: FACTORY, number }
}

function adapterError(error: unknown): GitHubAdapterError | undefined {
	return error instanceof GitHubAdapterError ? error : undefined
}

function unusedRead(): Promise<never> {
	throw new Error("unexpected read")
}

function unusedWrite(): Promise<never> {
	throw new Error("unexpected write")
}

function writes(): readonly FactoryWrite[] {
	return [
		claimWrite(key(), CLAIMED_AT_MS),
		labelWrite(key(), "needs-info", true),
		labelWrite(key(), "agent-working", false),
		statusWrite(key(), "In review"),
		commentWrite(key(), "exit:spec-gap", "The Spec does not say which host to use."),
	]
}

function idleClient(overrides: Partial<GitHubClient> = {}): GitHubClient {
	return {
		listIssues: unusedRead,
		listBlockers: unusedRead,
		listTimeline: unusedRead,
		listComments: async () => [],
		getProject: unusedRead,
		listProjectFields: unusedRead,
		listProjectItems: unusedRead,
		addLabel: unusedWrite,
		removeLabel: unusedWrite,
		addComment: unusedWrite,
		updateProjectStatus: unusedWrite,
		...overrides,
	}
}

describe("applying Factory writes", () => {
	it("prints every intended write and performs none in dry-run mode", async () => {
		const printed: string[] = []
		let writesPerformed = 0
		const client = idleClient({
			addLabel: async () => {
				writesPerformed++
			},
			removeLabel: async () => {
				writesPerformed++
			},
			addComment: async () => {
				writesPerformed++
			},
			updateProjectStatus: async () => {
				writesPerformed++
			},
		})

		await applyWrites(client, BOARD, writes(), {
			dryRun: true,
			print: (line) => printed.push(line),
		})

		expect(writesPerformed).toBe(0)
		expect(printed).toHaveLength(5)
		expect(printed[0]).toBe(`claim ${FACTORY}#7 at ${CLAIMED_AT_MS}`)
		expect(printed[1]).toBe(`add label "needs-info" to ${FACTORY}#7`)
		expect(printed[2]).toBe(`remove label "agent-working" from ${FACTORY}#7`)
		expect(printed[3]).toBe(`set status ${FACTORY}#7 to "In review"`)
		expect(printed[4]).toStartWith(`comment ${FACTORY}#7 "exit:spec-gap":`)
		expect(printed[4]).toContain(AI_DISCLAIMER)
	})

	it("posts a comment once across repeated runs and applies labels and Status", async () => {
		const comments: GitHubCommentData[] = []
		const labels: string[] = []
		const statuses: string[] = []
		const client = idleClient({
			listComments: async () => comments,
			addLabel: async (_issue, label) => {
				labels.push(`add:${label}`)
			},
			removeLabel: async (_issue, label) => {
				labels.push(`remove:${label}`)
			},
			addComment: async (_issue, body) => {
				comments.push({ id: comments.length + 1, body })
			},
			updateProjectStatus: async (itemId, projectId, fieldId, optionId) => {
				statuses.push([itemId, projectId, fieldId, optionId].join("|"))
			},
		})

		await applyWrites(client, BOARD, writes(), { dryRun: false })
		await applyWrites(client, BOARD, writes(), { dryRun: false })

		expect(comments).toHaveLength(1)
		expect(comments[0]?.body.startsWith(AI_DISCLAIMER)).toBe(true)
		expect(comments[0]?.body).toContain("The Spec does not say which host to use.")
		expect(labels).toEqual([
			"add:agent-working",
			"add:needs-info",
			"remove:agent-working",
			"add:agent-working",
			"add:needs-info",
			"remove:agent-working",
		])
		expect(statuses).toEqual([
			"PVTI_lADOFOg3Is4Bpqr_zhG7-Ac|PVT_kwDOFOg3Is4Bpqr_|PVTSSF_lADOFOg3Is4Bpqr_zhoFPn0|df73e18b",
			"PVTI_lADOFOg3Is4Bpqr_zhG7-Ac|PVT_kwDOFOg3Is4Bpqr_|PVTSSF_lADOFOg3Is4Bpqr_zhoFPn0|df73e18b",
		])
	})

	it("rejects a comment that does not open with the AI disclaimer", async () => {
		const write: FactoryWrite = {
			kind: "comment",
			issue: key(),
			key: "exit:spec-gap",
			body: "A bare comment.",
		}

		const error = adapterError(
			await applyWrites(idleClient(), BOARD, [write], { dryRun: true }).catch(
				(caught: unknown) => caught,
			),
		)

		expect(error?.code).toBe("comment-missing-disclaimer")
	})

	it("rejects a comment without its idempotency marker", async () => {
		const write: FactoryWrite = {
			kind: "comment",
			issue: key(),
			key: "exit:spec-gap",
			body: `${AI_DISCLAIMER}\n\nA bare comment.`,
		}

		const error = adapterError(
			await applyWrites(idleClient(), BOARD, [write], { dryRun: true }).catch(
				(caught: unknown) => caught,
			),
		)

		expect(error?.code).toBe("comment-missing-marker")
	})

	it("rejects a Status write for an issue that is not on the board", async () => {
		const board: Board = { ...BOARD, itemIds: {} }

		const error = adapterError(
			await applyWrites(idleClient(), board, [statusWrite(key(), "Done")], {
				dryRun: true,
			}).catch((caught: unknown) => caught),
		)

		expect(error?.code).toBe("issue-not-on-board")
	})
})

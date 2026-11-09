import { describe, expect, it } from "bun:test"
import type { IssueKey } from "../contracts"
import { applyWrites } from "./apply"
import type { Board } from "./board"
import type { GitHubCommentData } from "./client"
import { adapterError, testClient } from "./fixtures/test-client"
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

function writes(): readonly FactoryWrite[] {
	return [
		claimWrite(key(), CLAIMED_AT_MS),
		labelWrite(key(), "needs-info", true),
		labelWrite(key(), "agent-working", false),
		statusWrite(key(), "In review"),
		commentWrite(key(), "exit:spec-gap", "The Spec does not say which host to use."),
	]
}

const LIVE = { dryRun: false, print: () => {} } as const

describe("applying Factory writes", () => {
	it("prints every intended write and performs none in dry-run mode", async () => {
		const printed: string[] = []
		let writesPerformed = 0
		const client = testClient({
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
		const client = testClient({
			listComments: async () => comments,
			addLabel: async (_issue, label) => {
				labels.push(`add:${label}`)
			},
			removeLabel: async (_issue, label) => {
				labels.push(`remove:${label}`)
			},
			addComment: async (_issue, body) => {
				comments.push({ id: comments.length + 1, body, author_association: "MEMBER" })
			},
			updateProjectStatus: async (itemId, projectId, fieldId, optionId) => {
				statuses.push([itemId, projectId, fieldId, optionId].join("|"))
			},
		})

		await applyWrites(client, BOARD, writes(), LIVE)
		await applyWrites(client, BOARD, writes(), LIVE)

		expect(comments).toHaveLength(1)
		expect(comments[0]?.body.startsWith(AI_DISCLAIMER)).toBe(true)
		expect(labels).toEqual([
			"add:agent-working",
			"add:needs-info",
			"remove:agent-working",
			"add:agent-working",
			"add:needs-info",
			"remove:agent-working",
		])
		expect(statuses).toHaveLength(2)
	})

	it("does not let a stranger quoting the marker suppress a Factory comment", async () => {
		const comments: GitHubCommentData[] = [
			{ id: 1, body: "> <!-- factory:comment:exit:spec-gap --> quoted by a stranger" },
		]
		const client = testClient({
			listComments: async () => comments,
			addComment: async (_issue, body) => {
				comments.push({ id: comments.length + 1, body })
			},
		})

		await applyWrites(
			client,
			BOARD,
			[commentWrite(key(), "exit:spec-gap", "A question for the owner.")],
			LIVE,
		)

		expect(comments).toHaveLength(2)
		expect(comments[1]?.body.startsWith(AI_DISCLAIMER)).toBe(true)
	})

	it("reports a board rejection without performing an earlier write", async () => {
		let writesPerformed = 0
		const client = testClient({
			addLabel: async () => {
				writesPerformed++
			},
		})
		const batch: readonly FactoryWrite[] = [
			labelWrite(key(), "needs-info", true),
			statusWrite(key(8), "Done"),
		]

		const error = adapterError(
			await applyWrites(client, BOARD, batch, LIVE).catch((caught: unknown) => caught),
		)

		expect(error?.code).toBe("issue-not-on-board")
		expect(writesPerformed).toBe(0)
	})
})

import { describe, expect, it } from "bun:test"
import type { IssueKey } from "../contracts"
import { applyWrites } from "./apply"
import type { Board } from "./board"
import type { CreateIssueRequest, CreatePullRequestRequest } from "./create"
import { testClient } from "./fixtures/test-client"
import { followUpOrigin, followUpWrite, pullRequestWrite } from "./run-writes"

const FACTORY = "trajectonomics/factory"
const ISSUE: IssueKey = { repository: FACTORY, number: 9 }
const BOARD: Board = {
	projectId: "PVT_project",
	statusFieldId: "PVTSSF_status",
	statusOptionIds: { "In progress": "progress", "In review": "review", Done: "done" },
	itemIds: { "trajectonomics/factory#9": "PVTI_item" },
}
const PULL_REQUEST: CreatePullRequestRequest = {
	repository: FACTORY,
	title: "Ticket Run end to end",
	body: "Closes #9",
	head: "factory/9-ticket-run-end-to-end",
	base: "main",
	draft: false,
	labels: ["factory"],
}
const FOLLOW_UP: CreateIssueRequest = {
	repository: FACTORY,
	title: "Provision the release token",
	body: "Only the owner can create it.",
	labels: ["ready-for-human"],
}

function writes() {
	return [pullRequestWrite(ISSUE, PULL_REQUEST), followUpWrite(ISSUE, FOLLOW_UP)]
}

describe("applying run writes", () => {
	it("prints the pull request and Follow-up Ticket and performs neither in a dry run", async () => {
		const printed: string[] = []
		let writesPerformed = 0
		const client = testClient({
			createPullRequest: async () => {
				writesPerformed++
			},
			createIssue: async () => {
				writesPerformed++
			},
		})

		await applyWrites(client, BOARD, writes(), {
			dryRun: true,
			print: (line) => printed.push(line),
		})

		expect(writesPerformed).toBe(0)
		expect(printed).toEqual([
			'open ready pull request "Ticket Run end to end" from factory/9-ticket-run-end-to-end into main',
			'file follow-up "Provision the release token" in trajectonomics/factory',
		])
	})

	it("opens the pull request and files the Follow-up Ticket in a live run", async () => {
		const pullRequests: CreatePullRequestRequest[] = []
		const issues: CreateIssueRequest[] = []
		const client = testClient({
			createPullRequest: async (request) => {
				pullRequests.push(request)
			},
			createIssue: async (request) => {
				issues.push(request)
			},
		})

		await applyWrites(client, BOARD, writes(), { dryRun: false, print: () => {} })

		expect(pullRequests).toEqual([PULL_REQUEST])
		expect(issues).toEqual([
			{ ...FOLLOW_UP, body: `${followUpOrigin(ISSUE.number)}\n\n${FOLLOW_UP.body}` },
		])
	})
})

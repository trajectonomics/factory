import { describe, expect, it } from "bun:test"
import type { IssueKey } from "../contracts"
import type { GitHubIssueData, GitHubTimelineEvent } from "./client"
import { loadFixture } from "./fixtures/load"
import { testClient } from "./fixtures/test-client"
import { readRepositoryState } from "./read"

const FACTORY = "trajectonomics/factory"

function key(number: number): IssueKey {
	return { repository: FACTORY, number }
}

async function issueFixture(): Promise<GitHubIssueData> {
	return loadFixture<GitHubIssueData>("issue-7.json")
}

async function timelineFixture(): Promise<readonly GitHubTimelineEvent[]> {
	return loadFixture<readonly GitHubTimelineEvent[]>("timeline-7.json")
}

describe("reading GitHub issues", () => {
	it("reads a Ticket with its parent, closed blocker and label-event Claim time", async () => {
		const issue = await issueFixture()
		const blockers = await loadFixture<readonly GitHubIssueData[]>("blocked-by-7.json")
		const timeline = await loadFixture<readonly GitHubTimelineEvent[]>("timeline-7.json")

		const state = await readRepositoryState(
			testClient({
				listIssues: async () => [issue],
				listBlockers: async () => blockers,
				listTimeline: async () => timeline,
			}),
			[FACTORY],
			[],
		)

		expect(state).toEqual({
			issues: [
				{
					key: key(7),
					kind: "ticket",
					status: "open",
					labels: ["enhancement", "ready-for-agent", "agent-working"],
					parentSpec: key(2),
					blockers: [{ key: key(4), status: "closed" }],
					claim: { claimedAtMs: 1794136657000 },
				},
			],
			liveThreads: [],
		})
	})

	it("reads a parent issue as a Spec", async () => {
		const parent = await loadFixture<GitHubIssueData>("parent-7.json")

		const state = await readRepositoryState(
			testClient({ listIssues: async () => [parent] }),
			[FACTORY],
			[],
		)

		expect(state.issues).toHaveLength(1)
		expect(state.issues[0]?.key).toEqual(key(2))
		expect(state.issues[0]?.kind).toBe("spec")
		expect(state.issues[0]?.parentSpec).toBeUndefined()
	})

	it("carries the live threads supplied by the caller into the repository state", async () => {
		const issue = await issueFixture()

		const state = await readRepositoryState(
			testClient({ listIssues: async () => [issue], listTimeline: timelineFixture }),
			[FACTORY],
			[key(9)],
		)

		expect(state.liveThreads).toEqual([key(9)])
	})
})

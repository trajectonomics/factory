import { describe, expect, it } from "bun:test"
import type { IssueKey } from "../contracts"
import type { GitHubClient, GitHubIssueData, GitHubTimelineEvent } from "./client"
import { GitHubAdapterError } from "./errors"
import { loadFixture } from "./fixtures/load"
import { readRepositoryState } from "./read"

const FACTORY = "trajectonomics/factory"

function key(number: number): IssueKey {
	return { repository: FACTORY, number }
}

function client(overrides: Partial<GitHubClient> = {}): GitHubClient {
	const unusedRead = async (): Promise<never> => {
		throw new Error("unexpected read")
	}
	const unusedWrite = async (): Promise<never> => {
		throw new Error("unexpected write")
	}
	return {
		listIssues: async () => [],
		listBlockers: async () => [],
		listTimeline: async () => [],
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

async function issueFixture(): Promise<GitHubIssueData> {
	return loadFixture<GitHubIssueData>("issue-7.json")
}

function adapterError(error: unknown): GitHubAdapterError | undefined {
	return error instanceof GitHubAdapterError ? error : undefined
}

describe("reading GitHub issues", () => {
	it("reads a Ticket with its parent, closed blocker and label-event Claim time", async () => {
		const issue = await issueFixture()
		const blockers = await loadFixture<readonly GitHubIssueData[]>("blocked-by-7.json")
		const timeline = await loadFixture<readonly GitHubTimelineEvent[]>("timeline-7.json")

		const state = await readRepositoryState(
			client({
				listIssues: async () => [issue],
				listBlockers: async () => blockers,
				listTimeline: async () => timeline,
			}),
			[FACTORY],
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

		const state = await readRepositoryState(client({ listIssues: async () => [parent] }), [FACTORY])

		expect(state.issues).toHaveLength(1)
		expect(state.issues[0]?.key).toEqual(key(2))
		expect(state.issues[0]?.kind).toBe("spec")
		expect(state.issues[0]?.parentSpec).toBeUndefined()
	})

	it("falls back to the issue update time when the label event is missing", async () => {
		const issue = await issueFixture()

		const state = await readRepositoryState(
			client({ listIssues: async () => [issue], listTimeline: async () => [] }),
			[FACTORY],
		)

		expect(state.issues[0]?.claim).toEqual({ claimedAtMs: 1794136658000 })
	})

	it("rejects a Ticket blocked by its own parent Spec", async () => {
		const issue = await issueFixture()

		const error = adapterError(
			await readRepositoryState(
				client({
					listIssues: async () => [issue],
					listBlockers: async () => {
						const blocker = await loadFixture<GitHubIssueData>("parent-7.json")
						return [blocker]
					},
				}),
				[FACTORY],
			).catch((caught: unknown) => caught),
		)

		expect(error?.code).toBe("spec-child-blocking-edge")
		expect(error?.field).toBe(`issues[${FACTORY}#7].blockers[${FACTORY}#2]`)
	})

	it("rejects a blocking edge from a Spec to its own child", async () => {
		const parent = await loadFixture<GitHubIssueData>("parent-7.json")
		const child = await issueFixture()

		const error = adapterError(
			await readRepositoryState(
				client({
					listIssues: async () => [parent, child],
					listBlockers: async (issue) => (issue.number === 2 ? [child] : []),
				}),
				[FACTORY],
			).catch((caught: unknown) => caught),
		)

		expect(error?.code).toBe("spec-child-blocking-edge")
		expect(error?.field).toBe(`issues[${FACTORY}#2].blockers[${FACTORY}#7]`)
	})

	it("rejects an issue URL that does not name a repository", async () => {
		const issue = await issueFixture()
		const malformed: GitHubIssueData = { ...issue, repository_url: "https://example.com/x" }

		const error = adapterError(
			await readRepositoryState(client({ listIssues: async () => [malformed] }), [FACTORY]).catch(
				(caught: unknown) => caught,
			),
		)

		expect(error?.code).toBe("malformed-issue-url")
	})

	it("rejects an issue state GitHub does not define", async () => {
		const issue = await issueFixture()
		const malformed: GitHubIssueData = { ...issue, state: "merged" }

		const error = adapterError(
			await readRepositoryState(client({ listIssues: async () => [malformed] }), [FACTORY]).catch(
				(caught: unknown) => caught,
			),
		)

		expect(error?.code).toBe("malformed-issue-state")
	})

	it("rejects a Claim time that is not a valid instant", async () => {
		const issue = await issueFixture()
		const malformed: GitHubIssueData = { ...issue, updated_at: "not-a-date" }

		const error = adapterError(
			await readRepositoryState(
				client({ listIssues: async () => [malformed], listTimeline: async () => [] }),
				[FACTORY],
			).catch((caught: unknown) => caught),
		)

		expect(error?.code).toBe("invalid-claim-time")
	})
})

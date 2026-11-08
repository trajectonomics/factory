import { describe, expect, it } from "bun:test"
import type { GitHubIssueData, GitHubTimelineEvent } from "./client"
import { loadFixture } from "./fixtures/load"
import { adapterError, testClient } from "./fixtures/test-client"
import { readRepositoryState } from "./read"

const FACTORY = "trajectonomics/factory"

async function issueFixture(): Promise<GitHubIssueData> {
	return loadFixture<GitHubIssueData>("issue-7.json")
}

async function timelineFixture(): Promise<readonly GitHubTimelineEvent[]> {
	return loadFixture<readonly GitHubTimelineEvent[]>("timeline-7.json")
}

describe("reading malformed GitHub responses", () => {
	it("rejects an agent-working label without a labeled timeline event", async () => {
		const issue = await issueFixture()

		const error = adapterError(
			await readRepositoryState(
				testClient({ listIssues: async () => [issue], listTimeline: async () => [] }),
				[FACTORY],
				[],
			).catch((caught: unknown) => caught),
		)

		expect(error?.code).toBe("missing-claim-event")
	})

	it("rejects a labeled Claim event with an unparseable time", async () => {
		const issue = await issueFixture()
		const timeline: readonly GitHubTimelineEvent[] = [
			{ event: "labeled", label: { name: "agent-working" }, created_at: "not-a-date" },
		]

		const error = adapterError(
			await readRepositoryState(
				testClient({ listIssues: async () => [issue], listTimeline: async () => timeline }),
				[FACTORY],
				[],
			).catch((caught: unknown) => caught),
		)

		expect(error?.code).toBe("malformed-claim-time")
	})

	it("rejects a Ticket blocked by its own parent Spec", async () => {
		const issue = await issueFixture()
		const parent = await loadFixture<GitHubIssueData>("parent-7.json")

		const error = adapterError(
			await readRepositoryState(
				testClient({
					listIssues: async () => [issue],
					listBlockers: async () => [parent],
					listTimeline: timelineFixture,
				}),
				[FACTORY],
				[],
			).catch((caught: unknown) => caught),
		)

		expect(error?.code).toBe("ticket-blocked-by-parent-spec")
		expect(error?.field).toBe(`issues[${FACTORY}#7].blockers[${FACTORY}#2]`)
	})

	it("rejects a Spec blocked by its own child", async () => {
		const parent = await loadFixture<GitHubIssueData>("parent-7.json")
		const child = await issueFixture()

		const error = adapterError(
			await readRepositoryState(
				testClient({
					listIssues: async () => [parent, child],
					listBlockers: async (issue) => (issue.number === 2 ? [child] : []),
					listTimeline: timelineFixture,
				}),
				[FACTORY],
				[],
			).catch((caught: unknown) => caught),
		)

		expect(error?.code).toBe("spec-blocked-by-child")
		expect(error?.field).toBe(`issues[${FACTORY}#2].blockers[${FACTORY}#7]`)
	})

	it("rejects an issue URL that does not name a repository", async () => {
		const issue = await issueFixture()
		const malformed: GitHubIssueData = { ...issue, repository_url: "https://example.com/x" }

		const error = adapterError(
			await readRepositoryState(
				testClient({ listIssues: async () => [malformed] }),
				[FACTORY],
				[],
			).catch((caught: unknown) => caught),
		)

		expect(error?.code).toBe("malformed-issue-url")
	})

	it("rejects a parent URL that does not name a repository", async () => {
		const issue = await issueFixture()
		const malformed: GitHubIssueData = { ...issue, parent_issue_url: "https://example.com/2" }

		const error = adapterError(
			await readRepositoryState(
				testClient({ listIssues: async () => [malformed] }),
				[FACTORY],
				[],
			).catch((caught: unknown) => caught),
		)

		expect(error?.code).toBe("malformed-parent-url")
	})

	it("rejects a parent URL that does not name an issue number", async () => {
		const issue = await issueFixture()
		const malformed: GitHubIssueData = {
			...issue,
			parent_issue_url: `https://api.github.com/repos/${FACTORY}`,
		}

		const error = adapterError(
			await readRepositoryState(
				testClient({ listIssues: async () => [malformed] }),
				[FACTORY],
				[],
			).catch((caught: unknown) => caught),
		)

		expect(error?.code).toBe("malformed-parent-url")
	})

	it("rejects an issue state GitHub does not define", async () => {
		const issue = await issueFixture()
		const malformed: GitHubIssueData = { ...issue, state: "merged" }

		const error = adapterError(
			await readRepositoryState(
				testClient({ listIssues: async () => [malformed], listTimeline: timelineFixture }),
				[FACTORY],
				[],
			).catch((caught: unknown) => caught),
		)

		expect(error?.code).toBe("malformed-issue-state")
	})

	it("names a malformed blocker state with its parent and blocker path", async () => {
		const issue = await issueFixture()
		const blocker = (await loadFixture<readonly GitHubIssueData[]>("blocked-by-7.json"))[0]
		if (blocker === undefined) throw new Error("fixture shape changed")
		const malformed: GitHubIssueData = { ...blocker, state: "merged" }

		const error = adapterError(
			await readRepositoryState(
				testClient({
					listIssues: async () => [issue],
					listBlockers: async () => [malformed],
					listTimeline: timelineFixture,
				}),
				[FACTORY],
				[],
			).catch((caught: unknown) => caught),
		)

		expect(error?.code).toBe("malformed-issue-state")
		expect(error?.field).toBe(`issues[${FACTORY}#7].blockers[${FACTORY}#4].state`)
	})
})

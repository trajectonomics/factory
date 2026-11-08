import { CLAIM_LABEL } from "../claim"
import type { Blocker, IssueKey, IssueState, RepositoryState } from "../contracts"
import { deepFreeze } from "../freeze"
import { keyOf } from "../keys"
import type { GitHubClient, GitHubIssueData, GitHubTimelineEvent } from "./client"
import { GitHubAdapterError } from "./errors"
import { claimOf, issueKeyOf, issueKindOf, issueStatusOf, parentOf } from "./parse"

/** Reads open issues, their native blockers and parent links into the core's input contract. */
export async function readRepositoryState(
	client: GitHubClient,
	repositories: readonly string[],
): Promise<RepositoryState> {
	const issues: IssueState[] = []
	for (const repository of repositories) {
		for (const issue of await client.listIssues(repository)) {
			issues.push(await readIssue(client, issue))
		}
	}
	rejectSpecChildBlockingEdges(issues)
	return deepFreeze({ issues, liveThreads: [] })
}

async function readIssue(client: GitHubClient, issue: GitHubIssueData): Promise<IssueState> {
	const key = issueKeyOf(issue)
	const parentSpec = parentOf(issue)
	const claim = claimOf(issue, await claimEvents(client, issue, key), key)
	return {
		key,
		kind: issueKindOf(issue, parentSpec),
		status: issueStatusOf(issue.state, `issues[${keyOf(key)}].state`),
		labels: issue.labels.map((label) => label.name),
		...(parentSpec === undefined ? {} : { parentSpec }),
		blockers: (await client.listBlockers(key)).map(blockerOf),
		...(claim === undefined ? {} : { claim }),
	}
}

async function claimEvents(
	client: GitHubClient,
	issue: GitHubIssueData,
	key: IssueKey,
): Promise<readonly GitHubTimelineEvent[]> {
	if (!issue.labels.some((label) => label.name === CLAIM_LABEL)) return []
	return client.listTimeline(key)
}

function blockerOf(issue: GitHubIssueData): Blocker {
	const key = issueKeyOf(issue)
	return {
		key,
		status: issueStatusOf(issue.state, `issues[${keyOf(key)}].state`),
	}
}

function rejectSpecChildBlockingEdges(issues: readonly IssueState[]): void {
	const byKey = new Map(issues.map((issue) => [keyOf(issue.key), issue]))
	for (const issue of issues) {
		if (issue.kind === "spec") rejectBlockedByOwnChild(issue, byKey)
		if (issue.parentSpec === undefined) continue
		rejectBlockedByOwnParent(issue)
	}
}

function rejectBlockedByOwnParent(issue: IssueState): void {
	if (issue.parentSpec === undefined) return
	const parentKey = keyOf(issue.parentSpec)
	if (!issue.blockers.some((blocker) => keyOf(blocker.key) === parentKey)) return
	throw new GitHubAdapterError(
		"spec-child-blocking-edge",
		`issues[${keyOf(issue.key)}].blockers[${parentKey}]`,
		`${keyOf(issue.key)} is blocked by its own parent Spec ${parentKey}`,
	)
}

function rejectBlockedByOwnChild(spec: IssueState, issues: ReadonlyMap<string, IssueState>): void {
	for (const blocker of spec.blockers) {
		const child = issues.get(keyOf(blocker.key))
		if (child?.parentSpec === undefined) continue
		if (keyOf(child.parentSpec) !== keyOf(spec.key)) continue
		throw new GitHubAdapterError(
			"spec-child-blocking-edge",
			`issues[${keyOf(spec.key)}].blockers[${keyOf(blocker.key)}]`,
			`${keyOf(spec.key)} is blocked by its own child ${keyOf(blocker.key)}`,
		)
	}
}

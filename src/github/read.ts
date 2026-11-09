import { CLAIM_LABEL } from "../claim"
import type { Blocker, IssueKey, IssueState, RepositoryState } from "../contracts"
import { deepFreeze } from "../freeze"
import { copyIssueKey, keyOf } from "../keys"
import { authorAssociationOf } from "./author-association"
import type { GitHubClient, GitHubIssueData, GitHubTimelineEvent } from "./client"
import { GitHubAdapterError } from "./errors"
import { claimOf, issueKeyOf, issueKindOf, issueStatusOf, parentOf } from "./parse"

/** Reads open issues, native blockers, parent links and the caller's live threads into the core's input. */
export async function readRepositoryState(
	client: GitHubClient,
	repositories: readonly string[],
	liveThreads: readonly IssueKey[],
): Promise<RepositoryState> {
	const issues: IssueState[] = []
	for (const repository of repositories) {
		for (const issue of await client.listIssues(repository)) {
			issues.push(await readIssue(client, issue))
		}
	}
	rejectSpecChildBlockingEdges(issues)
	return deepFreeze({ issues, liveThreads: liveThreads.map(copyIssueKey) })
}

async function readIssue(client: GitHubClient, issue: GitHubIssueData): Promise<IssueState> {
	const key = issueKeyOf(issue, `issues[#${issue.number}].repository_url`)
	const parentSpec = parentOf(issue, key)
	const claim = claimOf(issue, await claimEvents(client, issue, key), key)
	return {
		key,
		kind: issueKindOf(issue, parentSpec),
		status: issueStatusOf(issue.state, `issues[${keyOf(key)}].state`),
		labels: issue.labels.map((label) => label.name),
		...(issue.title === undefined ? {} : { title: issue.title }),
		authorAssociation: authorAssociationOf(issue.author_association),
		...(parentSpec === undefined ? {} : { parentSpec }),
		blockers: (await client.listBlockers(key)).map((blocker) => blockerOf(blocker, key)),
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

function blockerOf(issue: GitHubIssueData, parent: IssueKey): Blocker {
	const parentKey = keyOf(parent)
	const key = issueKeyOf(issue, `issues[${parentKey}].blockers[#${issue.number}].repository_url`)
	return {
		key,
		status: issueStatusOf(issue.state, `issues[${parentKey}].blockers[${keyOf(key)}].state`),
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
		"ticket-blocked-by-parent-spec",
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
			"spec-blocked-by-child",
			`issues[${keyOf(spec.key)}].blockers[${keyOf(blocker.key)}]`,
			`${keyOf(spec.key)} is blocked by its own child ${keyOf(blocker.key)}`,
		)
	}
}

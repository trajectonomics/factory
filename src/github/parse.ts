import { CLAIM_LABEL } from "../claim"
import type { Claim, IssueKey, IssueKind, IssueStatus } from "../contracts"
import { keyOf } from "../keys"
import type { GitHubIssueData, GitHubTimelineEvent } from "./client"
import { GitHubAdapterError } from "./errors"

/** Reads `owner/name` from a GitHub API or web issue URL, naming the caller's field on failure. */
export function repositoryFromUrl(
	url: string,
	field: string,
	code: "malformed-issue-url" | "malformed-parent-url" = "malformed-issue-url",
): string {
	const match = /(?:api\.github\.com\/repos|github\.com)\/([^/]+)\/([^/?#]+)/.exec(url)
	if (match === null) {
		throw new GitHubAdapterError(
			code,
			field,
			`GitHub returned an issue URL without a repository: ${url}`,
		)
	}
	return `${match[1]}/${match[2]}`
}

/** The core key of a GitHub issue response. */
export function issueKeyOf(issue: GitHubIssueData, field: string): IssueKey {
	return { repository: repositoryFromUrl(issue.repository_url, field), number: issue.number }
}

/** Maps GitHub's issue state onto the core's closed world. */
export function issueStatusOf(state: string, field: string): IssueStatus {
	if (state === "open" || state === "closed") return state
	throw new GitHubAdapterError(
		"malformed-issue-state",
		field,
		`GitHub returned an unknown issue state: ${state}`,
	)
}

/** A parent link is a Ticket; otherwise only an issue with children is a Spec. */
export function issueKindOf(issue: GitHubIssueData, parent: IssueKey | undefined): IssueKind {
	if (parent !== undefined) return "ticket"
	return (issue.sub_issues_summary?.total ?? 0) > 0 ? "spec" : "ticket"
}

/** The native parent link, when GitHub reports one. */
export function parentOf(issue: GitHubIssueData, key: IssueKey): IssueKey | undefined {
	if (issue.parent_issue_url === undefined || issue.parent_issue_url === null) return undefined
	const field = `issues[${keyOf(key)}].parent_issue_url`
	return {
		repository: repositoryFromUrl(issue.parent_issue_url, field, "malformed-parent-url"),
		number: issueNumberFromUrl(issue.parent_issue_url, field),
	}
}

/** The Claim carried by the `agent-working` label, timed from its latest label event. */
export function claimOf(
	issue: GitHubIssueData,
	events: readonly GitHubTimelineEvent[],
	key: IssueKey,
): Claim | undefined {
	if (!issue.labels.some((label) => label.name === CLAIM_LABEL)) return undefined
	return { claimedAtMs: claimTime(events, key) }
}

function claimTime(events: readonly GitHubTimelineEvent[], key: IssueKey): number {
	const field = `issues[${keyOf(key)}].claim.claimedAtMs`
	let labeledEvent: GitHubTimelineEvent | undefined
	for (const event of events) {
		if (event.label?.name !== CLAIM_LABEL) continue
		if (event.event === "labeled") labeledEvent = event
		if (event.event === "unlabeled") labeledEvent = undefined
	}
	if (labeledEvent === undefined) {
		throw new GitHubAdapterError(
			"missing-claim-event",
			field,
			`${keyOf(key)} carries the Claim label without a labeled timeline event`,
		)
	}
	const claimedAtMs = instantOf(labeledEvent.created_at)
	if (claimedAtMs === undefined) {
		throw new GitHubAdapterError(
			"malformed-claim-time",
			field,
			`GitHub returned no valid Claim event time for ${keyOf(key)}`,
		)
	}
	return claimedAtMs
}

function instantOf(value: string): number | undefined {
	const at = Date.parse(value)
	return Number.isFinite(at) ? at : undefined
}

function issueNumberFromUrl(url: string, field: string): number {
	const match = /\/issues\/(\d+)\/?$/.exec(url)
	const number = match?.[1]
	if (number === undefined) {
		throw new GitHubAdapterError(
			"malformed-parent-url",
			field,
			`GitHub returned a parent URL without an issue number: ${url}`,
		)
	}
	return Number(number)
}

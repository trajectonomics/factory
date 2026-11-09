import type { FactoryPullRequest, RunExit } from "../dispatch-contracts"
import { evaluateIntakeGuard } from "../intake-guard"
import { NEEDS_INFO_LABEL, READY_FOR_HUMAN_LABEL } from "../labels"
import { authorAssociationOf } from "./author-association"
import type { GitHubClient, GitHubCommentData, GitHubIssueData } from "./client"
import { instantOf } from "./ledger-time"
import { issueKeyOf } from "./parse"
import { AI_DISCLAIMER } from "./writes"

const SPEC_GAP_MARKER = "<!-- factory:comment:exit:spec-gap"
const FOLLOW_UP_ORIGIN = /^Follow-up from #([1-9]\d*)\./

/** The gate-failure Exits among the open Factory pull requests: each draft one is a Run that failed its Gate. */
export function gateFailureExits(pullRequests: readonly FactoryPullRequest[]): readonly RunExit[] {
	return pullRequests
		.filter((pullRequest) => pullRequest.draft)
		.map((pullRequest) => ({
			issue: pullRequest.issue,
			kind: "gate-failure",
			atMs: pullRequest.openedAtMs,
		}))
}

/** The follow-up Exits among the open issues: a `ready-for-human` issue that opens with `Follow-up from #<n>.`. */
export function followUpExits(issues: readonly GitHubIssueData[]): readonly RunExit[] {
	return issues.flatMap((data) => {
		if (!data.labels.some((label) => label.name === READY_FOR_HUMAN_LABEL)) return []
		const origin = FOLLOW_UP_ORIGIN.exec(data.body ?? "")?.[1]
		const atMs = instantOf(data.created_at)
		if (origin === undefined || atMs === undefined) return []
		const issue = {
			repository: issueKeyOf(data, `issues[#${data.number}]`).repository,
			number: Number(origin),
		}
		return [{ issue, kind: "follow-up" as const, atMs }]
	})
}

/** The spec-gap Exits among the open issues: a `needs-info` issue with a Factory spec-gap question. */
export async function specGapExits(
	client: GitHubClient,
	issues: readonly GitHubIssueData[],
): Promise<readonly RunExit[]> {
	const exits: RunExit[] = []
	for (const data of issues) {
		if (!data.labels.some((label) => label.name === NEEDS_INFO_LABEL)) continue
		const key = issueKeyOf(data, `issues[#${data.number}]`)
		const atMs = latestQuestionMs(await client.listComments(key))
		if (atMs !== undefined) exits.push({ issue: key, kind: "spec-gap", atMs })
	}
	return exits
}

function latestQuestionMs(comments: readonly GitHubCommentData[]): number | undefined {
	const times = comments
		.filter((comment) => isTrustedQuestion(comment))
		.map((comment) => instantOf(comment.created_at))
		.filter((at): at is number => at !== undefined)
	return times.length === 0 ? undefined : Math.max(...times)
}

function isTrustedQuestion(comment: GitHubCommentData): boolean {
	const trusted = evaluateIntakeGuard(authorAssociationOf(comment.author_association)).allowed
	return trusted && comment.body.startsWith(AI_DISCLAIMER) && comment.body.includes(SPEC_GAP_MARKER)
}

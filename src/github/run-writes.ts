import type { IssueKey } from "../contracts"
import type { FollowUpTicket } from "../follow-up"
import { deepFreeze } from "../freeze"
import { copyIssueKey } from "../keys"
import { READY_FOR_HUMAN_LABEL } from "../labels"
import type { CreatePullRequestRequest } from "./create"
import { assertFollowUpFields, assertPullRequestFields } from "./run-write-validation"

/** A pull request a Ticket Run opens, ready or draft. */
export type PullRequestWrite = {
	readonly kind: "pull-request"
	readonly issue: IssueKey
	readonly title: string
	readonly body: string
	readonly head: string
	readonly base: string
	readonly draft: boolean
	readonly labels: readonly string[]
}

/** A Follow-up Ticket a Ticket Run files. */
export type FollowUpWrite = {
	readonly kind: "follow-up"
	readonly issue: IssueKey
	readonly title: string
	readonly body: string
	readonly labels: readonly string[]
}

/** Creates a pull request write for a Ticket Run. */
export function pullRequestWrite(
	issue: IssueKey,
	request: CreatePullRequestRequest,
): PullRequestWrite {
	assertPullRequestFields(request, "request")
	return deepFreeze({
		kind: "pull-request",
		issue: copyIssueKey(issue),
		title: request.title,
		body: request.body,
		head: request.head,
		base: request.base,
		draft: request.draft,
		labels: [...request.labels],
	})
}

/** Creates a Follow-up Ticket write, always labelled ready-for-human. */
export function followUpWrite(issue: IssueKey, followUp: FollowUpTicket): FollowUpWrite {
	assertFollowUpFields(followUp, "followUp")
	return deepFreeze({
		kind: "follow-up",
		issue: copyIssueKey(issue),
		title: followUp.title,
		body: followUp.body,
		labels: [READY_FOR_HUMAN_LABEL],
	})
}

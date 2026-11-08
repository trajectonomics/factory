import type { FollowUpTicket } from "../follow-up"
import type { CreatePullRequestRequest } from "./create"
import { GitHubAdapterError, type GitHubAdapterErrorCode } from "./errors"

type PullRequestFields = Pick<CreatePullRequestRequest, "title" | "head" | "base">
type FollowUpFields = Pick<FollowUpTicket, "title" | "body">

/** Rejects a pull request write with an empty title, head or base. */
export function assertPullRequestFields(fields: PullRequestFields, field: string): void {
	assertPresent(fields.title, "empty-pull-request-title", `${field}.title`, "pull request title")
	assertPresent(fields.head, "empty-pull-request-head", `${field}.head`, "head branch")
	assertPresent(fields.base, "empty-pull-request-base", `${field}.base`, "base branch")
}

/** Rejects a Follow-up Ticket write with an empty title or body. */
export function assertFollowUpFields(fields: FollowUpFields, field: string): void {
	assertPresent(fields.title, "empty-follow-up-title", `${field}.title`, "Follow-up Ticket title")
	assertPresent(fields.body, "empty-follow-up-body", `${field}.body`, "Follow-up Ticket body")
}

function assertPresent(
	value: string,
	code: GitHubAdapterErrorCode,
	field: string,
	name: string,
): void {
	if (value.trim() !== "") return
	throw new GitHubAdapterError(code, field, `The ${name} must not be empty`)
}

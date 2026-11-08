/** The malformed inputs and impossible writes the GitHub adapter can reject. */
export type GitHubAdapterErrorCode =
	| "malformed-issue-url"
	| "malformed-parent-url"
	| "malformed-issue-state"
	| "malformed-claim-time"
	| "missing-claim-event"
	| "invalid-claim-time"
	| "ticket-blocked-by-parent-spec"
	| "spec-blocked-by-child"
	| "missing-status-field"
	| "missing-status-option"
	| "issue-not-on-board"
	| "invalid-comment-key"
	| "comment-missing-disclaimer"
	| "comment-missing-marker"
	| "project-items-incomplete"
	| "empty-pull-request-title"
	| "empty-pull-request-head"
	| "empty-pull-request-base"
	| "empty-follow-up-title"
	| "empty-follow-up-body"

/** A GitHub response or write that the adapter cannot accept. */
export class GitHubAdapterError extends Error {
	readonly code: GitHubAdapterErrorCode
	readonly field: string

	constructor(code: GitHubAdapterErrorCode, field: string, message: string) {
		super(message)
		this.name = "GitHubAdapterError"
		this.code = code
		this.field = field
	}
}

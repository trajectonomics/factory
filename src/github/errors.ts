/** The malformed inputs and impossible writes the GitHub adapter can reject. */
export type GitHubAdapterErrorCode =
	| "malformed-issue-url"
	| "malformed-issue-state"
	| "invalid-claim-time"
	| "spec-child-blocking-edge"
	| "missing-status-field"
	| "missing-status-option"
	| "issue-not-on-board"
	| "invalid-comment-key"
	| "comment-missing-disclaimer"
	| "comment-missing-marker"

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

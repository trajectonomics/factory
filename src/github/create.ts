/** A Follow-up Ticket the Factory files in the Run's repository. */
export type CreateIssueRequest = {
	readonly repository: string
	readonly title: string
	readonly body: string
	readonly labels: readonly string[]
}

/** A pull request the Factory opens for a Ticket Run. */
export type CreatePullRequestRequest = {
	readonly repository: string
	readonly title: string
	readonly body: string
	readonly head: string
	readonly base: string
	readonly draft: boolean
	readonly labels: readonly string[]
}

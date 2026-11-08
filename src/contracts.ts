/** Identifies an issue by repository and number. */
export type IssueKey = {
	readonly repository: string
	readonly number: number
}

/** Whether an issue is still open. */
export type IssueStatus = "open" | "closed"

/** Whether an issue is a Ticket or a Spec. */
export type IssueKind = "ticket" | "spec"

/** The `agent-working` Claim on an issue, and when it was applied. */
export type Claim = {
	readonly claimedAtMs: number
}

/** One blocking edge and the state of its blocker at read time. */
export type Blocker = {
	readonly key: IssueKey
	readonly status: IssueStatus
}

/** An issue as read for one eligibility pass. */
export type IssueState = {
	readonly key: IssueKey
	readonly kind: IssueKind
	readonly status: IssueStatus
	readonly labels: readonly string[]
	readonly parentSpec?: IssueKey
	readonly blockers: readonly Blocker[]
	readonly claim?: Claim
}

/** Every issue and live thread read for one eligibility pass. */
export type RepositoryState = {
	readonly issues: readonly IssueState[]
	readonly liveThreads: readonly IssueKey[]
}

/** One allowlisted repository and the single host that runs its Runs. */
export type AllowlistEntry = {
	readonly repository: string
	readonly host: string
}

/** The repositories the Factory may work, each mapped to its host. */
export type Allowlist = readonly AllowlistEntry[]

/** Why an item was not selected for a Run. */
export type SkipReason =
	| { readonly code: "closed" }
	| { readonly code: "needs-human" }
	| { readonly code: "needs-info" }
	| { readonly code: "wontfix" }
	| { readonly code: "repository-not-allowlisted" }
	| { readonly code: "not-approved" }
	| { readonly code: "open-blocker"; readonly blockers: readonly IssueKey[] }
	| { readonly code: "live-claim" }
	| { readonly code: "live-thread" }
	| { readonly code: "different-host"; readonly host: string }
	| { readonly code: "parent-spec-not-eligible"; readonly spec: IssueKey }
	| { readonly code: "no-eligible-children" }

/** An issue that was not selected, with the rule that skipped it. */
export type SkippedWork = {
	readonly issue: IssueKey
	readonly reason: SkipReason
}

/** One planned Spec Run and the open Tickets it covers. */
export type SpecRun = {
	readonly kind: "spec-run"
	readonly spec: IssueKey
	readonly tickets: readonly IssueKey[]
	readonly host: string
}

/** One planned Ticket Run for a standalone Ticket. */
export type TicketRun = {
	readonly kind: "ticket-run"
	readonly ticket: IssueKey
	readonly host: string
}

/** A Run the Dispatcher may launch. */
export type EligibleRun = SpecRun | TicketRun

/** The outcome of one eligibility pass. */
export type EligibilityPlan = {
	readonly runs: readonly EligibleRun[]
	readonly skipped: readonly SkippedWork[]
}

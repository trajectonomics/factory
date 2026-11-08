/** Why a Run stopped short of a ready pull request. */
export type RunFailureCause = "failed" | "provider-rate-limit"

/**
 * One finished Run that stopped short of a ready pull request.
 *
 * The adapter supplies only failures since the Ticket's current Approval and
 * since its last non-failure Exit: a later success or ready pull request
 * supersedes older failures, and re-approval resets the history. A Run whose
 * Lease expired without a ready pull request is recorded as `failed`, so a
 * crash loop exhausts the Ticket after two attempts.
 */
export type RunFailure = {
	readonly cause: RunFailureCause
	readonly failedAtMs: number
}

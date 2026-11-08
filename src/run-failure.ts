/** Why a Run stopped short of a ready pull request. */
export type RunFailureCause = "failed" | "provider-rate-limit"

/**
 * One finished Run that stopped short of a ready pull request.
 *
 * The adapter supplies only failures since the Ticket's current Approval and
 * since its last non-failure Exit. A gate failure (a draft pull request) and a
 * Lease-expired crash both count as `failed`; a ready pull request resets the
 * history. A spec gap or follow-up Exit is not an attempt and does not count,
 * and an urgent Exit does not count. Re-approval resets the history.
 */
export type RunFailure = {
	readonly cause: RunFailureCause
	readonly failedAtMs: number
}

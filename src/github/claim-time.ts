import { GitHubAdapterError } from "./errors"

/** Rejects an outbound Claim time that is not a non-negative integer of milliseconds. */
export function assertClaimTime(claimedAtMs: number, field: string): void {
	if (Number.isSafeInteger(claimedAtMs) && claimedAtMs >= 0) return
	throw new GitHubAdapterError(
		"invalid-claim-time",
		field,
		`The Claim time must be a non-negative integer: ${claimedAtMs}`,
	)
}

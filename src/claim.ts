import type { Claim } from "./contracts"

/** The two hours a Claim is honoured without a live thread behind it. */
export const CLAIM_LEASE_MS: number = 2 * 60 * 60 * 1000

/** Whether a Claim still holds its issue. */
export function isClaimLive(claim: Claim, hasLiveThread: boolean, nowMs: number): boolean {
	return hasLiveThread || nowMs - claim.claimedAtMs < CLAIM_LEASE_MS
}

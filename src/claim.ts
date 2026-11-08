import type { Claim } from "./contracts"

/** The `agent-working` label that marks a live Claim. */
export const CLAIM_LABEL: string = "agent-working"

/** The two hours a Claim is honoured without a live thread behind it. */
export const CLAIM_LEASE_MS: number = 2 * 60 * 60 * 1000

/** Whether a Claim still holds its issue. */
export function isClaimLive(claim: Claim, hasLiveThread: boolean, nowMs: number): boolean {
	return hasLiveThread || nowMs - claim.claimedAtMs < CLAIM_LEASE_MS
}

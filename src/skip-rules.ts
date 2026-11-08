import { CLAIM_LABEL, isClaimLive } from "./claim"
import { type EligibilityContext, isApproved, needsHuman } from "./context"
import type { IssueState, SkipReason } from "./contracts"
import { copyIssueKey, keyOf } from "./keys"
import { sortIssueKeys } from "./sort"

/** How a Ticket's Approval is supplied: its own label, or its parent Spec's. */
export type Approval = "required" | "covered"

// The first failing rule wins: closed, needs-human, wontfix, needs-info,
// repository-not-allowlisted, not-approved, open-blocker, live-claim, live-thread.
// Callers decide different-host and parent-spec-not-eligible.
/** Why an issue fails the rules that apply before its parent and blockers. */
export function baseSkipReason(
	issue: IssueState,
	context: EligibilityContext,
	approval: Approval,
): SkipReason | undefined {
	if (issue.status === "closed") return { code: "closed" }
	if (needsHuman(issue)) return { code: "needs-human" }
	if (issue.labels.includes("wontfix")) return { code: "wontfix" }
	if (issue.labels.includes("needs-info")) return { code: "needs-info" }
	if (!context.allowlist.has(issue.key.repository)) return { code: "repository-not-allowlisted" }
	if (approval === "required" && !isApproved(issue)) return { code: "not-approved" }
	return undefined
}

/** Why an issue cannot join a Run, ignoring blockers waived as ordering. */
export function eligibilitySkipReason(
	issue: IssueState,
	context: EligibilityContext,
	waivedBlockers: ReadonlySet<string> = new Set<string>(),
): SkipReason | undefined {
	const openBlockers = sortIssueKeys(
		issue.blockers
			.filter((blocker) => blocker.status === "open")
			.filter((blocker) => !waivedBlockers.has(keyOf(blocker.key)))
			.map((blocker) => blocker.key),
	)
	if (openBlockers.length > 0) {
		return { code: "open-blocker", blockers: openBlockers.map(copyIssueKey) }
	}
	const hasLiveThread = context.liveThreads.has(keyOf(issue.key))
	if (issue.claim !== undefined && isClaimLive(issue.claim, hasLiveThread, context.nowMs)) {
		return { code: "live-claim" }
	}
	if (issue.claim === undefined && issue.labels.includes(CLAIM_LABEL)) {
		return { code: "live-claim" }
	}
	if (hasLiveThread) return { code: "live-thread" }
	return undefined
}

/** The base and eligibility rules together. */
export function issueSkipReason(
	issue: IssueState,
	context: EligibilityContext,
	approval: Approval,
	waivedBlockers: ReadonlySet<string> = new Set<string>(),
): SkipReason | undefined {
	return (
		baseSkipReason(issue, context, approval) ??
		eligibilitySkipReason(issue, context, waivedBlockers)
	)
}

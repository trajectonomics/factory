import { isClaimLive } from "./claim"
import { type EligibilityContext, isApproved, keyOf, needsHuman } from "./context"
import type { IssueKey, IssueState, SkipReason } from "./contracts"
import { sortIssueKeys } from "./sort"

/** How a Ticket's Approval is supplied: its own label, or its parent Spec's. */
export type Approval = "required" | "covered"

/** Why an issue fails the rules that apply before its parent and blockers. */
export function baseSkipReason(
	issue: IssueState,
	context: EligibilityContext,
	approval: Approval,
): SkipReason | undefined {
	if (issue.status === "closed") return { code: "closed" }
	if (needsHuman(issue)) return { code: "needs-human" }
	if (!context.allowlist.has(issue.key.repository)) return { code: "repository-not-allowlisted" }
	if (approval === "required" && !isApproved(issue)) return { code: "not-approved" }
	return undefined
}

/** Why an approved issue cannot start or join a Run. */
export function readinessSkipReason(
	issue: IssueState,
	context: EligibilityContext,
	insideSpec: IssueState | null,
): SkipReason | undefined {
	const openBlockers = sortIssueKeys(
		issue.blockers
			.filter((blocker) => blocker.status === "open")
			.filter((blocker) => !isSiblingBlocker(blocker.key, insideSpec, context))
			.map((blocker) => blocker.key),
	)
	if (openBlockers.length > 0) return { code: "open-blocker", blockers: openBlockers }
	const hasLiveThread = context.liveThreads.has(keyOf(issue.key))
	if (issue.claim !== undefined && isClaimLive(issue.claim, hasLiveThread, context.nowMs)) {
		return { code: "live-claim" }
	}
	if (hasLiveThread) return { code: "live-thread" }
	return undefined
}

/** The base and readiness rules together. */
export function issueSkipReason(
	issue: IssueState,
	context: EligibilityContext,
	approval: Approval,
	insideSpec: IssueState | null,
): SkipReason | undefined {
	return baseSkipReason(issue, context, approval) ?? readinessSkipReason(issue, context, insideSpec)
}

/** A blocker inside the same Spec is ordering for its Run, not a block. */
function isSiblingBlocker(
	blocker: IssueKey,
	insideSpec: IssueState | null,
	context: EligibilityContext,
): boolean {
	if (insideSpec === null) return false
	const blockerIssue = context.issuesByKey.get(keyOf(blocker))
	if (blockerIssue === undefined) return false
	if (blockerIssue.kind !== "ticket" || blockerIssue.parentSpec === undefined) return false
	return keyOf(blockerIssue.parentSpec) === keyOf(insideSpec.key)
}

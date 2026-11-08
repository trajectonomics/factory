import {
	type AuthorAssociation,
	type GuardDecision,
	launchAllowed,
	launchStopped,
} from "./guard-contracts"

const TRUSTED_AUTHORS: ReadonlySet<AuthorAssociation> = new Set(["owner", "member", "collaborator"])

/** Stops an issue by a non-member, non-collaborator before it enters the Spec pipeline. */
export function evaluateIntakeGuard(association: AuthorAssociation): GuardDecision {
	if (TRUSTED_AUTHORS.has(association)) return launchAllowed()
	return launchStopped({ code: "untrusted-author", association })
}

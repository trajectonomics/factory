import {
	type AuthorAssociation,
	type GuardDecision,
	launchAllowed,
	launchStopped,
} from "./guard-contracts"

const TRUSTED_AUTHORS: ReadonlySet<AuthorAssociation> = new Set(["owner", "member", "collaborator"])

/** The Guard decision on an issue author's association for Spec pipeline intake. */
export function evaluateIntakeGuard(association: AuthorAssociation): GuardDecision {
	if (TRUSTED_AUTHORS.has(association)) return launchAllowed()
	return launchStopped({ code: "untrusted-author", association })
}

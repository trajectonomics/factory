import { deepFreeze } from "./freeze"

/** How GitHub associates an issue author with the repository. */
export type AuthorAssociation =
	| "owner"
	| "member"
	| "collaborator"
	| "contributor"
	| "first-time-contributor"
	| "first-timer"
	| "none"
	| "mannequin"

/** One host measurement that crossed its threshold. */
export type HostPressure =
	| { readonly code: "load"; readonly loadAverage: number; readonly threshold: number }
	| { readonly code: "memory"; readonly usedFraction: number; readonly threshold: number }
	| { readonly code: "disk"; readonly usedFraction: number; readonly threshold: number }

/** Why a Guard stopped the work it was given. */
export type GuardReason =
	| { readonly code: "queue-too-deep"; readonly depth: number; readonly threshold: number }
	| { readonly code: "host-pressure"; readonly pressures: readonly HostPressure[] }
	| { readonly code: "launch-too-soon"; readonly waitMs: number }
	| { readonly code: "schedule-disabled" }
	| { readonly code: "repository-paused"; readonly repository: string }
	| { readonly code: "untrusted-author"; readonly association: AuthorAssociation }

/** Whether a Guard allows the work it was given, and why it stops it. */
export type GuardDecision =
	| { readonly allowed: true }
	| { readonly allowed: false; readonly reason: GuardReason }

/** A Guard decision that allows launches. */
export function launchAllowed(): GuardDecision {
	return deepFreeze({ allowed: true })
}

/** A Guard decision that stops launches for the given reason. */
export function launchStopped(reason: GuardReason): GuardDecision {
	return deepFreeze({ allowed: false, reason })
}

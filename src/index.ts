/** Identifies the package. Replaced by the real modules as the Tickets land. */
export const FACTORY_NAME = "@trajectonomics/factory"

export { CLAIM_LEASE_MS } from "./claim"
export * from "./contracts"
export { evaluateEligibility } from "./eligibility"
export * from "./errors"
export type {
	AuthorAssociation,
	GuardDecision,
	GuardReason,
	HostPressure,
} from "./guard-contracts"
export * from "./host-guard"
export * from "./human-queue"
export * from "./intake-guard"
export * from "./kill-switch"
export * from "./pacing-guard"

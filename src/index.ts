/** Identifies the package. Replaced by the real modules as the Tickets land. */
export const FACTORY_NAME = "@trajectonomics/factory"

export { CLAIM_LEASE_MS } from "./claim"
export * from "./contracts"
export { evaluateEligibility } from "./eligibility"
export * from "./errors"
export { PROVIDER_RATE_LIMIT_BACKOFF_MS, reconcileWork } from "./reconciliation"
export type {
	ClaimRelease,
	ReconciliationPlan,
	TicketHandoff,
	TicketRequeue,
} from "./reconciliation-plan"

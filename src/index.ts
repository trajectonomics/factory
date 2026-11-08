/** Identifies the package. Replaced by the real modules as the Tickets land. */
export const FACTORY_NAME = "@trajectonomics/factory"

export { CLAIM_LEASE_MS } from "./claim"
export * from "./contracts"
export { evaluateEligibility } from "./eligibility"
export * from "./errors"
export type { RunLaunchInput } from "./run-launch"
export type { T3Client, T3LaunchRequest, T3Model, T3Thread, T3ThreadStatus } from "./t3"
export type { LaunchMode, RunLaunchOutcome } from "./t3-adapter"
export { launchRun, listLiveThreads } from "./t3-adapter"
export type { T3ErrorCode } from "./t3-errors"
export { T3Error } from "./t3-errors"

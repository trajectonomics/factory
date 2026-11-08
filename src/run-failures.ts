import type { RunFailure } from "./contracts"

/** How many of the Run's failures consumed an attempt. */
export function countFailedAttempts(failures: readonly RunFailure[]): number {
	return failures.filter((failure) => failure.cause === "failed").length
}

/** The latest Run failure, or undefined when the history is empty. */
export function latestRunFailure(failures: readonly RunFailure[]): RunFailure | undefined {
	return failures.reduce<RunFailure | undefined>(
		(latest, failure) =>
			latest === undefined || compareFailures(failure, latest) > 0 ? failure : latest,
		undefined,
	)
}

function compareFailures(left: RunFailure, right: RunFailure): number {
	if (left.failedAtMs !== right.failedAtMs) return left.failedAtMs - right.failedAtMs
	if (left.cause === right.cause) return 0
	return left.cause === "failed" ? 1 : -1
}

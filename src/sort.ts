import type { EligibleRun, IssueKey, SkippedWork } from "./contracts"

/** Orders issue keys by repository, then number. */
export function compareIssueKeys(left: IssueKey, right: IssueKey): number {
	if (left.repository !== right.repository) return left.repository < right.repository ? -1 : 1
	return left.number - right.number
}

/** Returns a sorted copy of the given keys. */
export function sortIssueKeys(keys: readonly IssueKey[]): IssueKey[] {
	return [...keys].sort(compareIssueKeys)
}

function runIssue(run: EligibleRun): IssueKey {
	return run.kind === "spec-run" ? run.spec : run.ticket
}

/** Returns the Runs sorted by the issue that needs them. */
export function sortRuns(runs: readonly EligibleRun[]): EligibleRun[] {
	return [...runs].sort((left, right) => compareIssueKeys(runIssue(left), runIssue(right)))
}

/** Returns the skips sorted by issue. */
export function sortSkipped(skipped: readonly SkippedWork[]): SkippedWork[] {
	return [...skipped].sort((left, right) => compareIssueKeys(left.issue, right.issue))
}

import type { EligibleRun, IssueKey } from "./contracts"

/** A stable key for an issue across repositories. */
export function keyOf(issue: IssueKey): string {
	return `${issue.repository}#${issue.number}`
}

/** The issue a planned Run is for. */
export function issueOfRun(run: EligibleRun): IssueKey {
	return run.kind === "spec-run" ? run.spec : run.ticket
}
/** Returns a copy of an issue key, so decisions never hold caller-owned objects. */
export function copyIssueKey(issue: IssueKey): IssueKey {
	return { repository: issue.repository, number: issue.number }
}

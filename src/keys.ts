import type { IssueKey } from "./contracts"

/** A stable key for an issue across repositories. */
export function keyOf(issue: IssueKey): string {
	return `${issue.repository}#${issue.number}`
}

/** Returns a copy of an issue key, so decisions never hold caller-owned objects. */
export function copyIssueKey(issue: IssueKey): IssueKey {
	return { repository: issue.repository, number: issue.number }
}

import type { IssueState } from "./contracts"
import { EligibilityError } from "./errors"
import { keyOf } from "./keys"

/** Indexes issues by key, rejecting a repository state that lists one key twice. */
export function indexIssues(issues: readonly IssueState[]): ReadonlyMap<string, IssueState> {
	const entries = new Map<string, IssueState>()
	for (const issue of issues) {
		const key = keyOf(issue.key)
		if (entries.has(key)) {
			throw new EligibilityError(
				"duplicate-issue-key",
				`issues[${key}]`,
				`The repository state contains ${key} more than once`,
			)
		}
		entries.set(key, issue)
	}
	return entries
}

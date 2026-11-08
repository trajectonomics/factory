import type { IssueKey } from "./contracts"
import { deepFreeze } from "./freeze"
import { keyOf } from "./keys"
import { sortIssueKeys } from "./sort"
import type { T3Thread, T3ThreadStatus } from "./t3"
import { T3Error } from "./t3-errors"

const TITLE_PREFIX = "traj/"
const TITLE_PATTERN = /^traj\/([^#\s/]+\/[^#\s/]+)#([1-9]\d*)$/
// An idle thread has no active turn, so the Claim Lease, not the thread, holds its issue.
const LIVE_STATUSES: ReadonlySet<T3ThreadStatus> = new Set([
	"preparing",
	"queued",
	"starting",
	"running",
	"waiting",
])

/** The Run thread title for an issue: `traj/<repo>#<n>`. */
export function threadTitleOf(issue: IssueKey): string {
	return `${TITLE_PREFIX}${issue.repository}#${issue.number}`
}

/** The issue a Run thread title names, or undefined for any other title. */
export function issueFromThreadTitle(title: string): IssueKey | undefined {
	const match = TITLE_PATTERN.exec(title)
	const repository = match?.[1]
	const numberText = match?.[2]
	if (repository === undefined || numberText === undefined) return undefined
	const number = Number(numberText)
	if (!Number.isSafeInteger(number)) {
		throw new T3Error(
			"unsafe-issue-number",
			"title",
			`The issue number ${numberText} is not a safe integer`,
		)
	}
	return deepFreeze({ repository, number })
}

/** The issues behind the live Run threads, once each, in issue order. */
export function liveThreadIssues(threads: readonly T3Thread[]): IssueKey[] {
	const issues = new Map<string, IssueKey>()
	for (const thread of threads) {
		if (!LIVE_STATUSES.has(thread.status)) continue
		const issue = issueFromThreadTitle(thread.title)
		if (issue === undefined) continue
		issues.set(keyOf(issue), issue)
	}
	return deepFreeze(sortIssueKeys([...issues.values()]))
}

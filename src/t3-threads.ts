import type { IssueKey } from "./contracts"
import { deepFreeze } from "./freeze"
import type { T3Thread, T3ThreadStatus } from "./t3"
import { T3Error } from "./t3-errors"

const TITLE_PREFIX = "traj/"
const RUN_TITLE_PATTERN = /^traj\/([^#\s/]+\/[^#\s/]+)#([1-9]\d*)$/
const LIVE_TITLE_PATTERN =
	/^(?:traj|triage|screen|qa|idea|learn|assist)\/([^#\s/]+\/[^#\s/]+)#([1-9]\d*)$/
/** The thread title prefixes the Dispatcher counts as Factory work on a host. */
const LIVE_TITLE_PREFIXES = [
	"traj/",
	"triage/",
	"screen/",
	"qa/",
	"idea/",
	"learn/",
	"assist/",
] as const
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
export function runThreadIssue(title: string): IssueKey | undefined {
	return issueOf(RUN_TITLE_PATTERN, title)
}

/** The issue a live thread title names under any of the seven work prefixes, or undefined. */
export function liveThreadIssue(title: string): IssueKey | undefined {
	return issueOf(LIVE_TITLE_PATTERN, title)
}

/** Whether a thread title carries one of the seven prefixes the Dispatcher counts as work. */
export function isLiveThreadTitle(title: string): boolean {
	return LIVE_TITLE_PREFIXES.some((prefix) => title.startsWith(prefix))
}

/** Whether a thread is live: it has an active turn. */
export function isLiveThread(thread: T3Thread): boolean {
	return LIVE_STATUSES.has(thread.status)
}

function issueOf(pattern: RegExp, title: string): IssueKey | undefined {
	const match = pattern.exec(title)
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

import type { IssueKey } from "./contracts"
import { deepFreeze } from "./freeze"
import type { T3Thread, T3ThreadStatus } from "./t3"
import { T3Error } from "./t3-errors"

const TITLE_PREFIX = "traj/"
const RUN_TITLE_PATTERN = /^traj\/([^#\s/]+\/[^#\s/]+)#([1-9]\d*)$/
const OTHER_LIVE_TITLE_PATTERN =
	/^(?:triage|screen|qa|idea|learn|assist)\/([^#\s/]+\/[^#\s/]+)#([1-9]\d*)$/
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

/** A thread title's repository and issue number, before the number is trusted. */
type TitleMatch = {
	readonly repository: string
	readonly numberText: string
}

/** The Run thread title for an issue: `traj/<repo>#<n>`. */
export function threadTitleOf(issue: IssueKey): string {
	return `${TITLE_PREFIX}${issue.repository}#${issue.number}`
}

/** The issue a Run thread title names, or undefined for any other title. */
export function runThreadIssue(title: string): IssueKey | undefined {
	const match = titleMatch(RUN_TITLE_PATTERN, title)
	return match === undefined ? undefined : trustedIssueOf(match)
}

/**
 * The issue a live thread title names under any of the seven work prefixes, or undefined.
 * A Run title is parsed strictly; the other six name no issue when their number cannot be trusted.
 */
export function liveThreadIssue(title: string): IssueKey | undefined {
	if (title.startsWith(TITLE_PREFIX)) return runThreadIssue(title)
	const match = titleMatch(OTHER_LIVE_TITLE_PATTERN, title)
	if (match === undefined) return undefined
	const number = Number(match.numberText)
	return Number.isSafeInteger(number)
		? deepFreeze({ repository: match.repository, number })
		: undefined
}

/** Whether a thread title carries one of the seven prefixes the Dispatcher counts as work. */
export function isLiveThreadTitle(title: string): boolean {
	return LIVE_TITLE_PREFIXES.some((prefix) => title.startsWith(prefix))
}

/** Whether a thread is live: it has an active turn. */
export function isLiveThread(thread: T3Thread): boolean {
	return LIVE_STATUSES.has(thread.status)
}

function titleMatch(pattern: RegExp, title: string): TitleMatch | undefined {
	const match = pattern.exec(title)
	const repository = match?.[1]
	const numberText = match?.[2]
	return repository === undefined || numberText === undefined
		? undefined
		: { repository, numberText }
}

/** The issue a trusted title names; an unsafe number fails the pass closed instead of skipping it. */
function trustedIssueOf(match: TitleMatch): IssueKey {
	const number = Number(match.numberText)
	if (!Number.isSafeInteger(number)) {
		throw new T3Error(
			"unsafe-issue-number",
			"title",
			`The issue number ${match.numberText} is not a safe integer`,
		)
	}
	return deepFreeze({ repository: match.repository, number })
}

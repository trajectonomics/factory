import type { AllowlistEntry, IssueKey, IssueState, RepositoryState } from "./contracts"

/** The lookup state shared by the eligibility rules. */
export type EligibilityContext = {
	readonly allowlist: ReadonlyMap<string, AllowlistEntry>
	readonly issuesByKey: ReadonlyMap<string, IssueState>
	readonly liveThreads: ReadonlySet<string>
	readonly nowMs: number
}

/** A stable key for an issue across repositories. */
export function keyOf(issue: IssueKey): string {
	return `${issue.repository}#${issue.number}`
}

/** Builds the lookup state one eligibility pass needs. */
export function createContext(
	state: RepositoryState,
	allowlist: readonly AllowlistEntry[],
	nowMs: number,
): EligibilityContext {
	return {
		allowlist: new Map(allowlist.map((entry) => [entry.repository, entry])),
		issuesByKey: new Map(state.issues.map((entry) => [keyOf(entry.key), entry])),
		liveThreads: new Set(state.liveThreads.map(keyOf)),
		nowMs,
	}
}

/** Whether the human approved an issue by labelling it ready-for-agent. */
export function isApproved(issue: IssueState): boolean {
	return issue.labels.includes("ready-for-agent")
}

/** Whether an issue needs human-only work, such as a host or cloud change. */
export function needsHuman(issue: IssueState): boolean {
	return issue.labels.includes("ready-for-human")
}

/** The host an allowlisted issue's Runs run on. Only call after the allowlist rule passed. */
export function hostOf(issue: IssueState, context: EligibilityContext): string {
	const entry = context.allowlist.get(issue.key.repository)
	if (entry === undefined) throw new Error(`${issue.key.repository} is not allowlisted`)
	return entry.host
}

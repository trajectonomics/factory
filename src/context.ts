import type { AllowlistEntry, IssueState, RepositoryState } from "./contracts"
import { EligibilityError } from "./errors"
import { keyOf } from "./keys"

/** The lookup state shared by the eligibility rules. */
export type EligibilityContext = {
	readonly allowlist: ReadonlyMap<string, AllowlistEntry>
	readonly issuesByKey: ReadonlyMap<string, IssueState>
	readonly liveThreads: ReadonlySet<string>
	readonly nowMs: number
}

/** Builds the lookup state one eligibility pass needs. */
export function createContext(
	state: RepositoryState,
	allowlist: readonly AllowlistEntry[],
	nowMs: number,
): EligibilityContext {
	return {
		allowlist: allowlistLookup(allowlist),
		issuesByKey: new Map(state.issues.map((entry) => [keyOf(entry.key), entry])),
		liveThreads: new Set(state.liveThreads.map(keyOf)),
		nowMs,
	}
}

function allowlistLookup(
	allowlist: readonly AllowlistEntry[],
): ReadonlyMap<string, AllowlistEntry> {
	const entries = new Map<string, AllowlistEntry>()
	for (const entry of allowlist) {
		if (entries.has(entry.repository)) {
			throw new EligibilityError(
				"duplicate-allowlist-entry",
				`allowlist[${entry.repository}]`,
				`The allowlist maps ${entry.repository} to more than one host`,
			)
		}
		entries.set(entry.repository, entry)
	}
	return entries
}

/** Whether the human approved an issue by labelling it ready-for-agent. */
export function isApproved(issue: IssueState): boolean {
	return issue.labels.includes("ready-for-agent")
}

/** Whether an issue needs human-only work, such as a host or cloud change. */
export function needsHuman(issue: IssueState): boolean {
	return issue.labels.includes("ready-for-human")
}

/** The host an allowlisted issue's Runs run on. */
export function hostOf(issue: IssueState, context: EligibilityContext): string {
	const entry = context.allowlist.get(issue.key.repository)
	if (entry === undefined) throw new Error(`${issue.key.repository} is not allowlisted`)
	return entry.host
}

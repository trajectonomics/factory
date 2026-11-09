import type { IssueKey } from "./contracts"

const FACTORY_BRANCH = /^factory\/(?:spec-)?([1-9]\d*)(?:-|$)/

/** The issue a Run branch (`factory/<n>-<slug>` or `factory/spec-<n>-<slug>`) works, if it names one. */
export function issueOfRunBranch(repository: string, branch: string): IssueKey | undefined {
	const number = Number(FACTORY_BRANCH.exec(branch)?.[1])
	return Number.isSafeInteger(number) ? { repository, number } : undefined
}

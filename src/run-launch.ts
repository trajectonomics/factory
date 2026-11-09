import type { IssueKey } from "./contracts"
import { deepFreeze } from "./freeze"
import { branchNameFor } from "./run-branch"
import type { T3LaunchRequest, T3Model } from "./t3"
import { T3Error } from "./t3-errors"
import { issueFromThreadTitle, threadTitleOf } from "./t3-threads"

/** What a Run needs to start: its issue, title, model and injected role brief. */
export type RunLaunchInput = {
	readonly issue: IssueKey
	readonly issueTitle: string
	readonly model: T3Model
	readonly roleBrief: string
	readonly branch?: string
}

// Mirrors the repository part of the Run thread title grammar.
const REPOSITORY_PATTERN = /^[^#\s/]+\/[^#\s/]+$/
const UNSAFE_PROMPT_CHARS = /[\p{Cc}\p{Cf}\s]+/gu
const QUOTE_OR_BACKSLASH = /["\\]/g

/** The T3 launch a Run makes, with the role brief injected into the prompt. */
export function runLaunchRequest(input: RunLaunchInput): T3LaunchRequest {
	const roleBrief = input.roleBrief.trim()
	if (roleBrief === "") {
		throw new T3Error("empty-role-brief", "roleBrief", "A Run needs a role brief")
	}
	const title = threadTitleOf(input.issue)
	assertThreadTitle(input.issue, title)
	const branch = branchFor(input)
	const ticket = `${input.issue.repository}#${input.issue.number}`
	const prompt = [
		roleBrief,
		"",
		`Ticket: ${ticket} (${titleData(input.issueTitle)})`,
		`Thread: ${title}`,
		`Branch: ${branch}`,
	].join("\n")
	return deepFreeze({
		title,
		branch,
		prompt,
		model: { provider: input.model.provider, model: input.model.model },
	})
}

function branchFor(input: RunLaunchInput): string {
	if (input.branch === undefined) return branchNameFor(input.issue.number, input.issueTitle)
	if (input.branch.trim() === "") {
		throw new T3Error("empty-branch", "branch", "A Run needs a branch")
	}
	return input.branch
}

function assertThreadTitle(issue: IssueKey, title: string): void {
	if (!REPOSITORY_PATTERN.test(issue.repository)) {
		throw new T3Error(
			"thread-title-mismatch",
			"issue.repository",
			`The repository ${JSON.stringify(issue.repository)} cannot be a Run thread title`,
		)
	}
	if (!Number.isSafeInteger(issue.number) || issue.number < 1) {
		throw new T3Error(
			"thread-title-mismatch",
			"issue.number",
			`The issue number ${issue.number} cannot be a Run thread title`,
		)
	}
	const parsed = issueFromThreadTitle(title)
	if (parsed?.repository === issue.repository && parsed.number === issue.number) return
	throw new T3Error(
		"thread-title-mismatch",
		"issue",
		`The title ${JSON.stringify(title)} does not name ${issue.repository}#${issue.number}`,
	)
}

function titleData(title: string): string {
	const sanitized = title.replace(UNSAFE_PROMPT_CHARS, " ").trim()
	return `"${sanitized.replace(QUOTE_OR_BACKSLASH, "\\$&")}"`
}

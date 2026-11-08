import type { IssueKey } from "./contracts"
import { deepFreeze } from "./freeze"
import { branchNameFor } from "./run-branch"
import type { T3LaunchRequest, T3Model } from "./t3"
import { T3Error } from "./t3-errors"
import { threadTitleOf } from "./t3-threads"

/** What a Run needs to start: its issue, title, model and injected role brief. */
export type RunLaunchInput = {
	readonly issue: IssueKey
	readonly issueTitle: string
	readonly model: T3Model
	readonly roleBrief: string
}

/** The T3 launch a Run makes, with the role brief injected into the prompt. */
export function runLaunchRequest(input: RunLaunchInput): T3LaunchRequest {
	const roleBrief = input.roleBrief.trim()
	if (roleBrief === "") {
		throw new T3Error("empty-role-brief", "roleBrief", "A Run needs a role brief")
	}
	const title = threadTitleOf(input.issue)
	const branch = branchFor(input)
	const ticket = `${input.issue.repository}#${input.issue.number}`
	const prompt = [
		roleBrief,
		"",
		`Ticket: ${ticket} (${input.issueTitle})`,
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
	try {
		return branchNameFor(input.issue.number, input.issueTitle)
	} catch (error) {
		if (error instanceof T3Error && error.code === "empty-slug") {
			throw new T3Error("empty-slug", "issueTitle", error.message)
		}
		throw error
	}
}

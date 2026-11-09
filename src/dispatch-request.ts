import type { EligibleRun, IssueState } from "./contracts"
import type { DispatchReading } from "./dispatch-contracts"
import { keyOf } from "./keys"
import { specBranchNameFor } from "./run-branch"
import { runLaunchRequest } from "./run-launch"
import type { T3LaunchRequest } from "./t3"
import { ticketRunBrief } from "./ticket-run-brief"

/** The parts of one pass the launch request needs. */
export type RequestInput = {
	readonly reading: DispatchReading
	readonly config: import("./dispatch-contracts").DispatchConfig
}
/** The T3 launch request for one selected Run. */
export function dispatchRequest(run: EligibleRun, input: RequestInput): T3LaunchRequest {
	const issue = run.kind === "spec-run" ? run.spec : run.ticket
	const issueTitle = titleOf(input, issue)
	const roleBrief =
		run.kind === "ticket-run"
			? ticketRunBrief(run.ticket)
			: `You are the implementer for Spec ${keyOf(run.spec)}. Use /implement-spec on one integration branch over ${run.tickets.map(keyOf).join(", ")}. Pass one Gate and open one pull request that closes the Spec and its Tickets.`
	const branch =
		run.kind === "spec-run" ? specBranchNameFor(run.spec.number, issueTitle) : undefined
	return runLaunchRequest({
		issue,
		issueTitle,
		model: input.config.model,
		roleBrief,
		...(branch === undefined ? {} : { branch }),
	})
}
function titleOf(
	input: RequestInput,
	issue: { readonly repository: string; readonly number: number },
) {
	const key = keyOf(issue)
	const found: IssueState | undefined = input.reading.state.issues.find(
		(candidate) => keyOf(candidate.key) === key,
	)
	return found?.title ?? ""
}

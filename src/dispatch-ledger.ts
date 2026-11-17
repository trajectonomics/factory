import type { DispatchLedger, HostThreads } from "./dispatch-contracts"
import { readThreads } from "./dispatch-threads"
import { deepFreeze } from "./freeze"
import type { GitHubClient, GitHubIssueData } from "./github/client"
import { followUpExits, gateFailureExits, specGapExits } from "./github/ledger-exits"
import { readOpenPullRequests } from "./github/ledger-pull-requests"
import { urgentExits } from "./t3-exits"

/** The open Factory pull requests and the Run Exits waiting on the owner, read from GitHub and T3. */
export async function readDispatchLedger(
	client: GitHubClient,
	inventory: readonly HostThreads[],
	repositories: readonly string[],
	nowMs: number,
): Promise<DispatchLedger> {
	const pullRequests = await readOpenPullRequests(client, repositories)
	const issues: GitHubIssueData[] = []
	for (const repository of repositories) issues.push(...(await client.listIssues(repository)))
	const exits = [
		...gateFailureExits(pullRequests),
		...(await specGapExits(client, issues)),
		...followUpExits(issues),
		...urgentExits(readThreads(inventory), repositories, nowMs),
	]
	return deepFreeze({ pullRequests, exits })
}

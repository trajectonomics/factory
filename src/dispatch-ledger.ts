import type { DispatchLedger } from "./dispatch-contracts"
import type { GitHubClient, GitHubIssueData } from "./github/client"
import { followUpExits, gateFailureExits, specGapExits, urgentExits } from "./github/ledger-exits"
import { readFactoryPullRequests } from "./github/ledger-pull-requests"
import type { T3Client } from "./t3"

/** Reads the open Factory pull requests and the Run Exits waiting on the owner, from GitHub and T3. */
export async function readDispatchLedger(
	client: GitHubClient,
	t3: T3Client,
	repositories: readonly string[],
	nowMs: number,
): Promise<DispatchLedger> {
	const pullRequests = await readFactoryPullRequests(client, repositories)
	const issues: GitHubIssueData[] = []
	for (const repository of repositories) issues.push(...(await client.listIssues(repository)))
	const exits = [
		...gateFailureExits(pullRequests),
		...(await specGapExits(client, issues)),
		...followUpExits(issues),
		...urgentExits(await t3.listThreads(), nowMs),
	]
	return { pullRequests, exits }
}

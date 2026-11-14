import { issueOfRunBranch } from "../branch-issue"
import type { FactoryPullRequest } from "../dispatch-contracts"
import type { GitHubClient } from "./client"
import { instantOf } from "./ledger-time"

/** Every open pull request of the repositories, whatever the head branch; the issue is set only when the head names one. */
export async function readOpenPullRequests(
	client: GitHubClient,
	repositories: readonly string[],
): Promise<readonly FactoryPullRequest[]> {
	const pullRequests: FactoryPullRequest[] = []
	for (const repository of repositories) {
		for (const data of await client.listPullRequests(repository)) {
			const openedAtMs = instantOf(data.created_at)
			if (openedAtMs === undefined) continue
			pullRequests.push({
				issue: issueOfRunBranch(repository, data.head.ref),
				number: data.number,
				head: data.head.ref,
				draft: data.draft === true,
				openedAtMs,
			})
		}
	}
	return pullRequests
}

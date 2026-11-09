import { issueOfRunBranch } from "../branch-issue"
import type { FactoryPullRequest } from "../dispatch-contracts"
import type { GitHubClient } from "./client"
import { instantOf } from "./ledger-time"

/** The open `factory/*` pull requests of the repositories, each tied to the issue its branch names. */
export async function readFactoryPullRequests(
	client: GitHubClient,
	repositories: readonly string[],
): Promise<readonly FactoryPullRequest[]> {
	const pullRequests: FactoryPullRequest[] = []
	for (const repository of repositories) {
		for (const data of await client.listPullRequests(repository)) {
			const issue = issueOfRunBranch(repository, data.head.ref)
			const openedAtMs = instantOf(data.created_at)
			if (issue === undefined || openedAtMs === undefined) continue
			pullRequests.push({
				issue,
				number: data.number,
				head: data.head.ref,
				draft: data.draft === true,
				openedAtMs,
			})
		}
	}
	return pullRequests
}

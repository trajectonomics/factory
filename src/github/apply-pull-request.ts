import type { ApplyOptions } from "./apply"
import type { GitHubClient } from "./client"
import { formatWrite } from "./format-write"
import type { PullRequestWrite } from "./run-writes"

/** Opens one pull request, or prints the intended pull request in dry-run mode. */
export async function applyPullRequest(
	client: GitHubClient,
	write: PullRequestWrite,
	options: ApplyOptions,
): Promise<void> {
	if (options.dryRun) return options.print(formatWrite(write))
	await client.createPullRequest({
		repository: write.issue.repository,
		title: write.title,
		body: write.body,
		head: write.head,
		base: write.base,
		draft: write.draft,
		labels: write.labels,
	})
}

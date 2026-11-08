import type { ApplyOptions } from "./apply"
import type { GitHubClient } from "./client"
import { formatWrite } from "./format-write"
import type { FollowUpWrite } from "./run-writes"

/** Files one Follow-up Ticket, or prints the intended one in dry-run mode. */
export async function applyFollowUp(
	client: GitHubClient,
	write: FollowUpWrite,
	options: ApplyOptions,
): Promise<void> {
	if (options.dryRun) return options.print(formatWrite(write))
	await client.createIssue({
		repository: write.issue.repository,
		title: write.title,
		body: write.body,
		labels: write.labels,
	})
}

import type { GitHubClient } from "./client"
import type { GhRunner } from "./gh-run"

/** The creation half of the GitHub client: Follow-up Tickets and pull requests. */
export function createGhCreateClient(
	run: GhRunner,
): Pick<GitHubClient, "createIssue" | "createPullRequest"> {
	return {
		createIssue: async (request) => {
			await run(
				[
					"issue",
					"create",
					"--repo",
					request.repository,
					"--title",
					request.title,
					"--body-file",
					"-",
					...labelArgs(request.labels),
				],
				request.body,
			)
		},
		createPullRequest: async (request) => {
			await run(
				[
					"pr",
					"create",
					"--repo",
					request.repository,
					"--head",
					request.head,
					"--base",
					request.base,
					"--title",
					request.title,
					"--body-file",
					"-",
					...(request.draft ? ["--draft"] : []),
					...labelArgs(request.labels),
				],
				request.body,
			)
		},
	}
}

function labelArgs(labels: readonly string[]): string[] {
	return labels.flatMap((label) => ["--label", label])
}

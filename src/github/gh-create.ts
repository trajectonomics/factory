import type { GitHubClient } from "./client"
import type { CreatePullRequestRequest } from "./create"
import { type GhRunner, getJson } from "./gh-run"

type CreatedPullRequest = {
	readonly number: number
	readonly url: string
}

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
			if (await pullRequestOnBranch(run, request)) return
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

async function pullRequestOnBranch(
	run: GhRunner,
	request: CreatePullRequestRequest,
): Promise<CreatedPullRequest | undefined> {
	const pullRequests = await getJson<readonly CreatedPullRequest[]>(run, [
		"pr",
		"list",
		"--repo",
		request.repository,
		"--head",
		request.head,
		"--state",
		"open",
		"--json",
		"number,url",
	])
	return pullRequests[0]
}

function labelArgs(labels: readonly string[]): string[] {
	return labels.flatMap((label) => ["--label", label])
}

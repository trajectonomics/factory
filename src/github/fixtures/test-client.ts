import type { GitHubClient } from "../client"
import { GitHubAdapterError } from "../errors"

/** Builds a fake GitHub client for adapter tests; every override is explicit. */
export function testClient(overrides: Partial<GitHubClient> = {}): GitHubClient {
	const unusedRead = async (): Promise<never> => {
		throw new Error("unexpected read")
	}
	const unusedWrite = async (): Promise<never> => {
		throw new Error("unexpected write")
	}
	return {
		listIssues: async () => [],
		listBlockers: async () => [],
		listTimeline: async () => [],
		listComments: async () => [],
		listSkills: async () => [],
		getProject: unusedRead,
		listProjectFields: unusedRead,
		listProjectItems: unusedRead,
		addLabel: unusedWrite,
		removeLabel: unusedWrite,
		addComment: unusedWrite,
		createIssue: unusedWrite,
		createPullRequest: unusedWrite,
		updateProjectStatus: unusedWrite,
		...overrides,
	}
}

/** Narrows a caught value to the adapter's typed error. */
export function adapterError(error: unknown): GitHubAdapterError | undefined {
	return error instanceof GitHubAdapterError ? error : undefined
}

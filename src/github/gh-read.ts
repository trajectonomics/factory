import type { GitHubClient } from "./client"
import { GitHubAdapterError } from "./errors"
import { getApi, getJson } from "./gh-json"
import type { GhRunner } from "./gh-run"
import {
	isCommentData,
	isFieldList,
	isIssueData,
	isItemList,
	isProjectData,
	isPullRequestData,
	isTimelineEvent,
} from "./gh-shapes"

const PAGE_LIMIT = 1000
const PAGE_SIZE = 100

/** The read half of the GitHub client, over `gh api` and `gh project`. */
export function createGhReadClient(
	run: GhRunner,
): Pick<
	GitHubClient,
	| "listIssues"
	| "listBlockers"
	| "listTimeline"
	| "listComments"
	| "listPullRequests"
	| "getProject"
	| "listProjectFields"
	| "listProjectItems"
> {
	return {
		listIssues: async (repository) =>
			(
				await getApi(
					run,
					`repos/${repository}/issues?state=open&per_page=${PAGE_SIZE}`,
					isIssueData,
				)
			).filter((issue) => issue.pull_request === undefined),
		listBlockers: async (issue) =>
			getApi(
				run,
				`repos/${issue.repository}/issues/${issue.number}/dependencies/blocked_by`,
				isIssueData,
			),
		listTimeline: async (issue) =>
			getApi(run, `repos/${issue.repository}/issues/${issue.number}/timeline`, isTimelineEvent),
		listComments: async (issue) =>
			getApi(run, `repos/${issue.repository}/issues/${issue.number}/comments`, isCommentData),
		listPullRequests: async (repository) =>
			getApi(run, `repos/${repository}/pulls?state=open&per_page=${PAGE_SIZE}`, isPullRequestData),
		getProject: async (project) =>
			getJson(
				run,
				["project", "view", String(project.number), "--owner", project.owner, "--format", "json"],
				isProjectData,
			),
		listProjectFields: async (project) =>
			getJson(
				run,
				[
					"project",
					"field-list",
					String(project.number),
					"--owner",
					project.owner,
					"--format",
					"json",
				],
				isFieldList,
			).then((response) => response.fields),
		listProjectItems: async (project) => {
			const response = await getJson(
				run,
				[
					"project",
					"item-list",
					String(project.number),
					"--owner",
					project.owner,
					"--format",
					"json",
					"--limit",
					String(PAGE_LIMIT),
				],
				isItemList,
			)
			if (response.items.length !== response.totalCount) {
				throw new GitHubAdapterError(
					"project-items-incomplete",
					"project.items",
					`Returned ${response.items.length} of ${response.totalCount} project items`,
				)
			}
			return response.items
		},
	}
}

import type {
	GitHubClient,
	GitHubCommentData,
	GitHubIssueData,
	GitHubProjectData,
	GitHubProjectFieldData,
	GitHubProjectItemData,
	GitHubTimelineEvent,
} from "./client"
import { type GhRunner, getApi, getJson } from "./gh-run"

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
	| "getProject"
	| "listProjectFields"
	| "listProjectItems"
> {
	return {
		listIssues: async (repository) =>
			(
				await getApi<GitHubIssueData>(
					run,
					`repos/${repository}/issues?state=open&per_page=${PAGE_SIZE}`,
				)
			).filter((issue) => issue.pull_request === undefined),
		listBlockers: async (issue) =>
			getApi<GitHubIssueData>(
				run,
				`repos/${issue.repository}/issues/${issue.number}/dependencies/blocked_by`,
			),
		listTimeline: async (issue) =>
			getApi<GitHubTimelineEvent>(run, `repos/${issue.repository}/issues/${issue.number}/timeline`),
		listComments: async (issue) =>
			getApi<GitHubCommentData>(run, `repos/${issue.repository}/issues/${issue.number}/comments`),
		getProject: async (project) =>
			getJson<GitHubProjectData>(run, [
				"project",
				"view",
				String(project.number),
				"--owner",
				project.owner,
				"--format",
				"json",
			]),
		listProjectFields: async (project) =>
			getJson<{ readonly fields: readonly GitHubProjectFieldData[] }>(run, [
				"project",
				"field-list",
				String(project.number),
				"--owner",
				project.owner,
				"--format",
				"json",
			]).then((response) => response.fields),
		listProjectItems: async (project) =>
			getJson<{ readonly items: readonly GitHubProjectItemData[] }>(run, [
				"project",
				"item-list",
				String(project.number),
				"--owner",
				project.owner,
				"--format",
				"json",
				"--limit",
				String(PAGE_LIMIT),
			]).then((response) => response.items),
	}
}

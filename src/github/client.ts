import type { IssueKey } from "../contracts"
import type { CreateIssueRequest, CreatePullRequestRequest } from "./create"

/** A GitHub project by owner and number. */
export type ProjectRef = {
	readonly owner: string
	readonly number: number
}

/** The parts of a GitHub issue response the adapter reads. */
export type GitHubIssueData = {
	readonly number: number
	readonly title?: string
	readonly author_association?: string
	readonly state: string
	readonly labels: readonly { readonly name: string }[]
	readonly repository_url: string
	readonly parent_issue_url?: string | null
	readonly sub_issues_summary?: { readonly total: number }
	readonly pull_request?: unknown
}

/** One label event on an issue timeline. */
export type GitHubTimelineEvent = {
	readonly event: string
	readonly created_at: string
	readonly label?: { readonly name: string }
}

/** One issue comment. */
export type GitHubCommentData = {
	readonly id: number | string
	readonly body: string
	readonly author_association?: string
}

/** A GitHub project response. */
export type GitHubProjectData = {
	readonly id: string
	readonly title: string
}

/** One project field, including the Status options when it is a single select. */
export type GitHubProjectFieldData = {
	readonly id: string
	readonly name: string
	readonly type: string
	readonly options?: readonly { readonly id: string; readonly name: string }[]
}

/** One card on a project board. */
export type GitHubProjectItemData = {
	readonly id: string
	/** Absent on a Draft card, which has no issue behind it. */
	readonly content?: {
		readonly number?: number
		readonly repository?: string
	}
}

/** The injected seam to GitHub: reads the fixtures record, writes the Factory's decisions. */
export type GitHubClient = {
	readonly listIssues: (repository: string) => Promise<readonly GitHubIssueData[]>
	readonly listBlockers: (issue: IssueKey) => Promise<readonly GitHubIssueData[]>
	readonly listTimeline: (issue: IssueKey) => Promise<readonly GitHubTimelineEvent[]>
	readonly listComments: (issue: IssueKey) => Promise<readonly GitHubCommentData[]>
	readonly getProject: (project: ProjectRef) => Promise<GitHubProjectData>
	readonly listProjectFields: (project: ProjectRef) => Promise<readonly GitHubProjectFieldData[]>
	readonly listProjectItems: (project: ProjectRef) => Promise<readonly GitHubProjectItemData[]>
	readonly addLabel: (issue: IssueKey, label: string) => Promise<void>
	readonly removeLabel: (issue: IssueKey, label: string) => Promise<void>
	readonly addComment: (issue: IssueKey, body: string) => Promise<void>
	readonly createIssue: (request: CreateIssueRequest) => Promise<void>
	readonly createPullRequest: (request: CreatePullRequestRequest) => Promise<void>
	readonly updateProjectStatus: (
		itemId: string,
		projectId: string,
		fieldId: string,
		optionId: string,
	) => Promise<void>
}

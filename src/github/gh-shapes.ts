import type {
	GitHubCommentData,
	GitHubIssueData,
	GitHubPullRequestData,
	GitHubProjectData,
	GitHubProjectFieldData,
	GitHubProjectItemData,
	GitHubTimelineEvent,
} from "./client"

type Fields = Readonly<Record<string, unknown>>

function isObject(value: unknown): value is Fields {
	return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** Whether a value has the issue fields the adapter reads. */
export function isIssueData(value: unknown): value is GitHubIssueData {
	return (
		isObject(value) &&
		typeof value["number"] === "number" &&
		typeof value["state"] === "string" &&
		typeof value["repository_url"] === "string" &&
		Array.isArray(value["labels"]) &&
		value["labels"].every((label) => isObject(label) && typeof label["name"] === "string")
	)
}

/** Whether a value is a timeline event; only `event` is common to every kind. */
export function isTimelineEvent(value: unknown): value is GitHubTimelineEvent {
	return isObject(value) && typeof value["event"] === "string"
}

/** Whether a value has the comment fields the adapter reads. */
export function isCommentData(value: unknown): value is GitHubCommentData {
	return (
		isObject(value) &&
		(typeof value["id"] === "number" || typeof value["id"] === "string") &&
		typeof value["body"] === "string"
	)
}

/** Whether a value is a directory entry with a name and, when GitHub says so, a type. */
export function isNamedEntry(
	value: unknown,
): value is { readonly name: string; readonly type?: string } {
	return (
		isObject(value) &&
		typeof value["name"] === "string" &&
		(value["type"] === undefined || typeof value["type"] === "string")
	)
}

/** Whether a value has the pull request fields the ledger reads. */
export function isPullRequestData(value: unknown): value is GitHubPullRequestData {
	return (
		isObject(value) &&
		typeof value["number"] === "number" &&
		typeof value["created_at"] === "string" &&
		isObject(value["head"]) &&
		typeof value["head"]["ref"] === "string"
	)
}

/** Whether a value is a project response. */
export function isProjectData(value: unknown): value is GitHubProjectData {
	return isObject(value) && typeof value["id"] === "string" && typeof value["title"] === "string"
}

/** Whether a value is a `gh project field-list` response. */
export function isFieldList(
	value: unknown,
): value is { readonly fields: readonly GitHubProjectFieldData[] } {
	return (
		isObject(value) &&
		Array.isArray(value["fields"]) &&
		value["fields"].every(
			(field) =>
				isObject(field) &&
				typeof field["id"] === "string" &&
				typeof field["name"] === "string" &&
				typeof field["type"] === "string",
		)
	)
}

/** Whether a value is a `gh project item-list` response. */
export function isItemList(value: unknown): value is {
	readonly items: readonly GitHubProjectItemData[]
	readonly totalCount: number
} {
	return (
		isObject(value) &&
		typeof value["totalCount"] === "number" &&
		Array.isArray(value["items"]) &&
		value["items"].every((item) => isObject(item) && typeof item["id"] === "string")
	)
}

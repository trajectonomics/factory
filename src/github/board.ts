import { keyOf } from "../keys"
import type {
	GitHubClient,
	GitHubProjectFieldData,
	GitHubProjectItemData,
	ProjectRef,
} from "./client"
import { GitHubAdapterError } from "./errors"

/** The board Status values the Factory writes, never reads (ADR 0001). */
export type BoardStatus = "In progress" | "In review" | "Done"

/** Every Status the Factory may write, in board order. */
export const BOARD_STATUSES: readonly BoardStatus[] = Object.freeze([
	"In progress",
	"In review",
	"Done",
])

const STATUS_FIELD_NAME = "Status"

/** The project metadata a Status write needs. */
export type Board = {
	readonly projectId: string
	readonly statusFieldId: string
	readonly statusOptionIds: Readonly<Record<BoardStatus, string>>
	readonly itemIds: Readonly<Record<string, string>>
}

/** Reads the project, its Status field and the cards the Factory may move. */
export async function readBoard(client: GitHubClient, project: ProjectRef): Promise<Board> {
	const projectData = await client.getProject(project)
	const field = (await client.listProjectFields(project)).find(
		(candidate) => candidate.name === STATUS_FIELD_NAME,
	)
	if (field === undefined) {
		throw new GitHubAdapterError(
			"missing-status-field",
			`fields[${STATUS_FIELD_NAME}]`,
			`Project ${project.owner}/${project.number} has no ${STATUS_FIELD_NAME} field`,
		)
	}
	const statusOptionIds = readStatusOptions(field)
	const items = await client.listProjectItems(project)
	return Object.freeze({
		projectId: projectData.id,
		statusFieldId: field.id,
		statusOptionIds: Object.freeze(statusOptionIds),
		itemIds: Object.freeze(itemLookup(items)),
	})
}

function readStatusOptions(field: GitHubProjectFieldData): Record<BoardStatus, string> {
	return {
		"In progress": statusOptionId(field, "In progress"),
		"In review": statusOptionId(field, "In review"),
		Done: statusOptionId(field, "Done"),
	}
}

function statusOptionId(field: GitHubProjectFieldData, status: BoardStatus): string {
	const option = field.options?.find((candidate) => candidate.name === status)
	if (option === undefined) {
		throw new GitHubAdapterError(
			"missing-status-option",
			`fields[${STATUS_FIELD_NAME}].options[${status}]`,
			`The ${STATUS_FIELD_NAME} field has no ${status} option`,
		)
	}
	return option.id
}

function itemLookup(items: readonly GitHubProjectItemData[]): Record<string, string> {
	const itemIds: Record<string, string> = {}
	for (const item of items) {
		const { repository, number } = item.content ?? {}
		if (repository === undefined || number === undefined) continue
		itemIds[keyOf({ repository, number })] = item.id
	}
	return itemIds
}

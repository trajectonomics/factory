import type { IssueKey } from "../contracts"
import { keyOf } from "../keys"
import type { Board } from "./board"
import { GitHubAdapterError } from "./errors"

/** Returns the board card id for an issue, rejecting an issue with no card. */
export function boardItemId(board: Board, issue: IssueKey, field: string): string {
	const itemId = board.itemIds[keyOf(issue)]
	if (itemId !== undefined) return itemId
	throw new GitHubAdapterError(
		"issue-not-on-board",
		field,
		`${keyOf(issue)} has no card on project ${board.projectId}`,
	)
}

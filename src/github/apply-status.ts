import { keyOf } from "../keys"
import type { Board } from "./board"
import type { GitHubClient } from "./client"
import { GitHubAdapterError } from "./errors"
import { formatWrite } from "./format-write"
import type { StatusWrite } from "./writes"

/** Moves one card, or prints the intended move in dry-run mode. */
export async function applyStatus(
	client: GitHubClient,
	board: Board,
	write: StatusWrite,
	dryRun: boolean,
	print: (line: string) => void,
): Promise<void> {
	const itemId = board.itemIds[keyOf(write.issue)]
	if (itemId === undefined) {
		throw new GitHubAdapterError(
			"issue-not-on-board",
			"writes[status].issue",
			`${keyOf(write.issue)} has no card on project ${board.projectId}`,
		)
	}
	if (dryRun) return print(formatWrite(write))
	await client.updateProjectStatus(
		itemId,
		board.projectId,
		board.statusFieldId,
		board.statusOptionIds[write.status],
	)
}

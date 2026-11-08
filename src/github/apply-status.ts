import type { Board } from "./board"
import { boardItemId } from "./board-item"
import type { GitHubClient } from "./client"
import { formatWrite } from "./format-write"
import type { StatusWrite } from "./writes"

/** Moves one card, or prints the intended move in dry-run mode. */
export async function applyStatus(
	client: GitHubClient,
	board: Board,
	write: StatusWrite,
	index: number,
	dryRun: boolean,
	print: (line: string) => void,
): Promise<void> {
	const itemId = boardItemId(board, write.issue, `writes[${index}].issue`)
	if (dryRun) return print(formatWrite(write))
	await client.updateProjectStatus(
		itemId,
		board.projectId,
		board.statusFieldId,
		board.statusOptionIds[write.status],
	)
}

import { keyOf } from "../keys"
import type { GitHubClient } from "./client"
import { formatWrite } from "./format-write"
import type { CommentWrite } from "./writes"

/** Posts one comment once, or prints the intended comment in dry-run mode. */
export async function applyComment(
	client: GitHubClient,
	write: CommentWrite,
	alreadyPosted: boolean,
	dryRun: boolean,
	print: (line: string) => void,
): Promise<void> {
	if (alreadyPosted) {
		if (dryRun) print(`skip comment ${keyOf(write.issue)} "${write.key}": already posted`)
		return
	}
	if (dryRun) return print(formatWrite(write))
	await client.addComment(write.issue, write.body)
}

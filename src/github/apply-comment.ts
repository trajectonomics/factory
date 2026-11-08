import { keyOf } from "../keys"
import type { GitHubClient } from "./client"
import { GitHubAdapterError } from "./errors"
import { formatWrite } from "./format-write"
import { AI_DISCLAIMER, assertCommentKey, type CommentWrite, commentMarker } from "./writes"

/** Posts one comment once, or prints the intended comment in dry-run mode. */
export async function applyComment(
	client: GitHubClient,
	write: CommentWrite,
	dryRun: boolean,
	print: (line: string) => void,
): Promise<void> {
	assertCommentKey(write.key)
	if (!write.body.startsWith(AI_DISCLAIMER)) {
		throw new GitHubAdapterError(
			"comment-missing-disclaimer",
			"writes[comment].body",
			`Every Factory comment must open with: ${AI_DISCLAIMER}`,
		)
	}
	const marker = commentMarker(write.key)
	if (!write.body.includes(marker)) {
		throw new GitHubAdapterError(
			"comment-missing-marker",
			"writes[comment].body",
			`The comment for ${write.key} has no idempotency marker`,
		)
	}
	const alreadyPosted = (await client.listComments(write.issue)).some((comment) =>
		comment.body.includes(marker),
	)
	if (alreadyPosted) {
		if (dryRun) print(`skip comment ${keyOf(write.issue)} "${write.key}": already posted`)
		return
	}
	if (dryRun) return print(formatWrite(write))
	await client.addComment(write.issue, write.body)
}

import { evaluateIntakeGuard } from "../intake-guard"
import { keyOf } from "../keys"
import { authorAssociationOf } from "./author-association"
import type { GitHubClient, GitHubCommentData } from "./client"
import { type FactoryWrite, isFactoryComment } from "./writes"

/**
 * Reads whether a comment write was already posted, before any write in a batch runs.
 * A repeat of the same issue and key inside one batch counts as posted by the first.
 */
export async function prepareComments(
	client: GitHubClient,
	writes: readonly FactoryWrite[],
): Promise<ReadonlyMap<number, boolean>> {
	const alreadyPosted = new Map<number, boolean>()
	const inBatch = new Set<string>()
	for (const [index, write] of writes.entries()) {
		if (write.kind !== "comment") continue
		const batchKey = `${keyOf(write.issue)}:${write.key}`
		const comments = await client.listComments(write.issue)
		alreadyPosted.set(
			index,
			inBatch.has(batchKey) || comments.some((comment) => isOurs(comment, write.key)),
		)
		inBatch.add(batchKey)
	}
	return alreadyPosted
}

/** Only a trusted author's comment can hold a marker, so a stranger cannot suppress a write. */
function isOurs(comment: GitHubCommentData, key: string): boolean {
	const trusted = evaluateIntakeGuard(authorAssociationOf(comment.author_association)).allowed
	return trusted && isFactoryComment(comment.body, key)
}

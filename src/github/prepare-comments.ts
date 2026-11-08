import type { GitHubClient } from "./client"
import { type FactoryWrite, isFactoryComment } from "./writes"

/** Reads whether a comment write was already posted, before any write in a batch runs. */
export async function prepareComments(
	client: GitHubClient,
	writes: readonly FactoryWrite[],
): Promise<ReadonlyMap<number, boolean>> {
	const alreadyPosted = new Map<number, boolean>()
	for (const [index, write] of writes.entries()) {
		if (write.kind !== "comment") continue
		const comments = await client.listComments(write.issue)
		alreadyPosted.set(
			index,
			comments.some((comment) => isFactoryComment(comment.body, write.key)),
		)
	}
	return alreadyPosted
}

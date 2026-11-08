import { CLAIM_LABEL } from "../claim"
import { applyComment } from "./apply-comment"
import { applyFollowUp } from "./apply-follow-up"
import { applyPullRequest } from "./apply-pull-request"
import { applyStatus } from "./apply-status"
import type { Board } from "./board"
import type { GitHubClient } from "./client"
import { formatWrite } from "./format-write"
import { prepareComments } from "./prepare-comments"
import { validateWrite } from "./validate-write"
import type { ClaimWrite, FactoryWrite, LabelWrite } from "./writes"

/** How a batch of writes runs: dry-run prints to the caller's sink, live writes. */
export type ApplyOptions = {
	readonly dryRun: boolean
	readonly print: (line: string) => void
}

/** Validates the whole batch, then applies it, or only prints it in dry-run mode. */
export async function applyWrites(
	client: GitHubClient,
	board: Board,
	writes: readonly FactoryWrite[],
	options: ApplyOptions,
): Promise<void> {
	writes.forEach((write, index) => {
		validateWrite(write, index, board)
	})
	const alreadyPosted = await prepareComments(client, writes)
	for (const [index, write] of writes.entries()) {
		await applyWrite(client, board, write, index, alreadyPosted.get(index) ?? false, options)
	}
}

async function applyWrite(
	client: GitHubClient,
	board: Board,
	write: FactoryWrite,
	index: number,
	alreadyPosted: boolean,
	options: ApplyOptions,
): Promise<void> {
	switch (write.kind) {
		case "claim":
			return applyClaim(client, write, options)
		case "label":
			return applyLabel(client, write, options)
		case "status":
			return applyStatus(client, board, write, index, options.dryRun, options.print)
		case "comment":
			return applyComment(client, write, alreadyPosted, options.dryRun, options.print)
		case "pull-request":
			return applyPullRequest(client, write, options)
		case "follow-up":
			return applyFollowUp(client, write, options)
	}
}

async function applyClaim(
	client: GitHubClient,
	write: ClaimWrite,
	options: ApplyOptions,
): Promise<void> {
	if (options.dryRun) return options.print(formatWrite(write))
	await client.addLabel(write.issue, CLAIM_LABEL)
}

async function applyLabel(
	client: GitHubClient,
	write: LabelWrite,
	options: ApplyOptions,
): Promise<void> {
	if (options.dryRun) return options.print(formatWrite(write))
	if (write.present) await client.addLabel(write.issue, write.label)
	else await client.removeLabel(write.issue, write.label)
}

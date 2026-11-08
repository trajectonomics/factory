import { stdout } from "node:process"
import { CLAIM_LABEL } from "../claim"
import { applyComment } from "./apply-comment"
import { applyStatus } from "./apply-status"
import type { Board } from "./board"
import type { GitHubClient } from "./client"
import { GitHubAdapterError } from "./errors"
import { formatWrite } from "./format-write"
import type { ClaimWrite, FactoryWrite, LabelWrite } from "./writes"

/** How a batch of writes runs: dry-run prints, live writes. */
export type ApplyOptions = {
	readonly dryRun: boolean
	readonly print?: (line: string) => void
}

/** Applies the Factory's writes, or only prints them in dry-run mode. */
export async function applyWrites(
	client: GitHubClient,
	board: Board,
	writes: readonly FactoryWrite[],
	options: ApplyOptions,
): Promise<void> {
	const print = options.print ?? ((line: string) => stdout.write(`${line}\n`))
	for (const write of writes) {
		await applyWrite(client, board, write, options.dryRun, print)
	}
}

async function applyWrite(
	client: GitHubClient,
	board: Board,
	write: FactoryWrite,
	dryRun: boolean,
	print: (line: string) => void,
): Promise<void> {
	switch (write.kind) {
		case "claim":
			return applyClaim(client, write, dryRun, print)
		case "label":
			return applyLabel(client, write, dryRun, print)
		case "status":
			return applyStatus(client, board, write, dryRun, print)
		case "comment":
			return applyComment(client, write, dryRun, print)
	}
}

async function applyClaim(
	client: GitHubClient,
	write: ClaimWrite,
	dryRun: boolean,
	print: (line: string) => void,
): Promise<void> {
	if (!Number.isSafeInteger(write.claimedAtMs) || write.claimedAtMs < 0) {
		throw new GitHubAdapterError(
			"invalid-claim-time",
			"writes[claim].claimedAtMs",
			`The Claim time must be a non-negative integer: ${write.claimedAtMs}`,
		)
	}
	if (dryRun) return print(formatWrite(write))
	await client.addLabel(write.issue, CLAIM_LABEL)
}

async function applyLabel(
	client: GitHubClient,
	write: LabelWrite,
	dryRun: boolean,
	print: (line: string) => void,
): Promise<void> {
	if (dryRun) return print(formatWrite(write))
	if (write.present) await client.addLabel(write.issue, write.label)
	else await client.removeLabel(write.issue, write.label)
}

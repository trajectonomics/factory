import type { Board } from "./board"
import { boardItemId } from "./board-item"
import { assertClaimTime } from "./claim-time"
import { GitHubAdapterError } from "./errors"
import { assertFollowUpFields, assertPullRequestFields } from "./run-write-validation"
import {
	AI_DISCLAIMER,
	assertCommentKey,
	type CommentWrite,
	commentMarker,
	type FactoryWrite,
} from "./writes"

/** Rejects one write before any write in a batch is performed. */
export function validateWrite(write: FactoryWrite, index: number, board: Board): void {
	switch (write.kind) {
		case "claim":
			assertClaimTime(write.claimedAtMs, `writes[${index}].claimedAtMs`)
			return
		case "label":
			assertLabelName(write.label, `writes[${index}].label`)
			return
		case "status":
			boardItemId(board, write.issue, `writes[${index}].issue`)
			return
		case "comment":
			validateComment(write, index)
			return
		case "pull-request":
			assertPullRequestFields(write, `writes[${index}]`)
			return
		case "follow-up":
			assertFollowUpFields(write, `writes[${index}]`)
			return
	}
}

function assertLabelName(label: string, field: string): void {
	if (!label.includes(",")) return
	throw new GitHubAdapterError(
		"invalid-label-name",
		field,
		`gh splits --add-label on commas, so a label name cannot contain one: ${label}`,
	)
}

function validateComment(write: CommentWrite, index: number): void {
	assertCommentKey(write.key, `writes[${index}].key`)
	if (!write.body.startsWith(AI_DISCLAIMER)) {
		throw new GitHubAdapterError(
			"comment-missing-disclaimer",
			`writes[${index}].body`,
			`Every Factory comment must open with: ${AI_DISCLAIMER}`,
		)
	}
	if (!write.body.includes(commentMarker(write.key))) {
		throw new GitHubAdapterError(
			"comment-missing-marker",
			`writes[${index}].body`,
			`The comment for ${write.key} has no idempotency marker`,
		)
	}
}

import { CLAIM_LABEL } from "./claim"
import type { IssueKey } from "./contracts"
import { deepFreeze } from "./freeze"
import { followUpWrite } from "./github/run-writes"
import {
	claimWrite,
	commentWrite,
	type FactoryWrite,
	labelWrite,
	statusWrite,
} from "./github/writes"
import { keyOf } from "./keys"
import { NEEDS_INFO_LABEL } from "./labels"
import { slugify } from "./run-branch"
import type {
	FollowUpReport,
	SpecGapReport,
	TicketRunPlan,
	TicketRunReport,
	UrgentReport,
} from "./ticket-run-contracts"
import { planGate } from "./ticket-run-gate"

const SPEC_GAP_KEY = "exit:spec-gap"

/** Claims a Ticket and moves its card to In progress when the Run starts. */
export function startTicketRun(ticket: IssueKey, claimedAtMs: number): readonly FactoryWrite[] {
	return deepFreeze([claimWrite(ticket, claimedAtMs), statusWrite(ticket, "In progress")])
}

/** Plans the writes a Ticket Run makes from the result it reports. */
export function planTicketRun(report: TicketRunReport): TicketRunPlan {
	switch (report.kind) {
		case "gate":
			return planGate(report)
		case "follow-up":
			return followUpPlan(report)
		case "spec-gap":
			return specGapPlan(report)
		case "urgent":
			return urgentPlan(report)
	}
}

function followUpPlan(report: FollowUpReport): TicketRunPlan {
	return deepFreeze({
		kind: "follow-up",
		waiting: false,
		writes: report.tickets.map((ticket) => followUpWrite(report.ticket, ticket)),
	})
}

function specGapPlan(report: SpecGapReport): TicketRunPlan {
	return deepFreeze({
		kind: "spec-gap",
		waiting: false,
		writes: [
			commentWrite(report.ticket, specGapKey(report.question), report.question),
			labelWrite(report.ticket, NEEDS_INFO_LABEL, true),
			labelWrite(report.ticket, CLAIM_LABEL, false),
		],
	})
}

function specGapKey(question: string): string {
	const slug = slugify(question)
	const hash = questionHash(question)
	return slug === "" ? `${SPEC_GAP_KEY}:${hash}` : `${SPEC_GAP_KEY}:${slug}:${hash}`
}

function questionHash(question: string): string {
	let hash = 0x811c9dc5
	for (const character of question) {
		hash ^= character.codePointAt(0) ?? 0
		hash = Math.imul(hash, 0x01000193) >>> 0
	}
	return hash.toString(16).padStart(8, "0")
}

function urgentPlan(report: UrgentReport): TicketRunPlan {
	return deepFreeze({
		kind: "urgent",
		waiting: true,
		writes: [],
		notification: `Ticket Run for ${keyOf(report.ticket)} needs the owner: ${report.reason}`,
	})
}

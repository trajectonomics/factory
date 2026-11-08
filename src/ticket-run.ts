import type { IssueKey } from "./contracts"
import { deepFreeze } from "./freeze"
import {
	claimWrite,
	commentWrite,
	type FactoryWrite,
	labelWrite,
	statusWrite,
} from "./github/writes"
import { keyOf } from "./keys"
import { NEEDS_INFO_LABEL } from "./labels"
import type {
	SpecGapReport,
	TicketRunPlan,
	TicketRunReport,
	UrgentReport,
} from "./ticket-run-contracts"
import { planGateReport } from "./ticket-run-gate"

export type {
	GateReport,
	SpecGapReport,
	TicketRunPlan,
	TicketRunReport,
	UrgentReport,
} from "./ticket-run-contracts"

const EXIT_COMMENT_KEY = "exit:spec-gap"

/** Claims a Ticket and moves its card to In progress when the Run starts. */
export function startTicketRun(ticket: IssueKey, claimedAtMs: number): readonly FactoryWrite[] {
	return deepFreeze([claimWrite(ticket, claimedAtMs), statusWrite(ticket, "In progress")])
}

/** Plans the writes a Ticket Run makes from the result it reports. */
export function planTicketRun(report: TicketRunReport): TicketRunPlan {
	switch (report.kind) {
		case "gate":
			return planGateReport(report)
		case "spec-gap":
			return specGapPlan(report)
		case "urgent":
			return urgentPlan(report)
	}
}

function specGapPlan(report: SpecGapReport): TicketRunPlan {
	return deepFreeze({
		kind: "spec-gap",
		waiting: false,
		writes: [
			commentWrite(report.ticket, EXIT_COMMENT_KEY, report.question),
			labelWrite(report.ticket, NEEDS_INFO_LABEL, true),
			labelWrite(report.ticket, "agent-working", false),
		],
	})
}

function urgentPlan(report: UrgentReport): TicketRunPlan {
	return deepFreeze({
		kind: "urgent",
		waiting: true,
		writes: [],
		notification: `Ticket Run for ${keyOf(report.ticket)} needs the owner: ${report.reason}`,
	})
}

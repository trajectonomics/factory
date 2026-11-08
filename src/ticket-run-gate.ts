import { CLAIM_LABEL } from "./claim"
import type { IssueKey } from "./contracts"
import { deepFreeze } from "./freeze"
import { evaluateGate } from "./gate"
import type { CreatePullRequestRequest } from "./github/create"
import { pullRequestWrite } from "./github/run-writes"
import { type FactoryWrite, labelWrite, statusWrite } from "./github/writes"
import { FACTORY_LABEL, READY_FOR_HUMAN_LABEL } from "./labels"
import type { GateReport, TicketRunPlan } from "./ticket-run-contracts"

/** Plans another Gate round, a ready pull request, or a draft after a gate failure. */
export function planReportedGate(report: GateReport): TicketRunPlan {
	const decision = evaluateGate(report.rounds)
	if (decision.kind === "rerun") return deepFreeze({ kind: "rerun", waiting: false, writes: [] })
	if (decision.kind === "ready") return gateWrites(report, false, closesBody(report.ticket))
	return gateWrites(report, true, findingsBody(report.ticket, decision.findings))
}

function gateWrites(report: GateReport, draft: boolean, body: string): TicketRunPlan {
	const writes: FactoryWrite[] = [
		pullRequestWrite(report.ticket, pullRequestRequest(report, draft, body)),
		labelWrite(report.ticket, CLAIM_LABEL, false),
		statusWrite(report.ticket, "In review"),
	]
	if (draft) writes.push(labelWrite(report.ticket, READY_FOR_HUMAN_LABEL, true))
	return deepFreeze({
		kind: draft ? "gate-failure" : "ready",
		waiting: false,
		writes,
	})
}

function pullRequestRequest(
	report: GateReport,
	draft: boolean,
	body: string,
): CreatePullRequestRequest {
	return {
		repository: report.ticket.repository,
		title: report.title,
		body,
		head: report.branch,
		base: report.base,
		draft,
		labels: [FACTORY_LABEL],
	}
}

function closesBody(ticket: IssueKey): string {
	return `Closes #${ticket.number}`
}

function findingsBody(ticket: IssueKey, findings: readonly string[]): string {
	const items = findings.map((finding) => `- ${finding}`).join("\n")
	return `${closesBody(ticket)}\n\n## Gate findings\n\n${items}`
}

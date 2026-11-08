import { CLAIM_LABEL } from "./claim"
import type { IssueKey } from "./contracts"
import { deepFreeze } from "./freeze"
import { evaluateGate, type GateReviewEvidence } from "./gate"
import type { CreatePullRequestRequest } from "./github/create"
import { pullRequestWrite } from "./github/run-writes"
import { type FactoryWrite, labelWrite, statusWrite } from "./github/writes"
import { FACTORY_LABEL, READY_FOR_HUMAN_LABEL } from "./labels"
import type { GateReport, TicketRunPlan } from "./ticket-run-contracts"

/** Plans another Gate round, a ready pull request, or a draft after a gate failure. */
export function planGate(report: GateReport): TicketRunPlan {
	const decision = evaluateGate(report.rounds)
	if (decision.kind === "rerun") return deepFreeze({ kind: "rerun", waiting: false, writes: [] })
	if (decision.kind === "ready") return planGateWrites(report, false, readyBody(report))
	return planGateWrites(report, true, draftBody(report, decision.findings))
}

function planGateWrites(report: GateReport, draft: boolean, body: string): TicketRunPlan {
	const writes: FactoryWrite[] = [
		pullRequestWrite(report.ticket, pullRequestRequest(report, draft, body)),
		labelWrite(report.ticket, CLAIM_LABEL, false),
	]
	if (draft) writes.push(labelWrite(report.ticket, READY_FOR_HUMAN_LABEL, true))
	else writes.push(statusWrite(report.ticket, "In review"))
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

function readyBody(report: GateReport): string {
	return `${closesBody(report.ticket)}${reviewsSection(report.reviews)}`
}

function draftBody(report: GateReport, findings: readonly string[]): string {
	const items = findings.map((finding) => `- ${finding}`).join("\n")
	const body = `${closesBody(report.ticket)}\n\n## Gate findings\n\n${items}`
	return `${body}${reviewsSection(report.reviews)}`
}

function reviewsSection(reviews: readonly GateReviewEvidence[]): string {
	if (reviews.length === 0) return ""
	const lines = reviews.map(
		(review) =>
			`- ${review.role} on ${review.provider}/${review.model}: ${review.thread} - ${review.verdict}, ${review.findingsFixed} findings fixed`,
	)
	return `\n\n## Reviews\n\n${lines.join("\n")}`
}

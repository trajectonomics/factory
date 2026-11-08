import { describe, expect, it } from "bun:test"
import type { IssueKey } from "./contracts"
import { GATE_REVIEWS } from "./fixtures/gate-reviews"
import type { GateRound } from "./gate"
import { planTicketRun, startTicketRun } from "./ticket-run"
import type { TicketRunReport } from "./ticket-run-contracts"

const TICKET: IssueKey = { repository: "trajectonomics/factory", number: 9 }
const TITLE = "Ticket Run end to end"
const BRANCH = "factory/9-ticket-run-end-to-end"
const BASE = "main"
const CLAIMED_AT_MS = 1_000_000_000

function round(overrides: Partial<GateRound> = {}): GateRound {
	return {
		checkPassed: true,
		conformance: { findings: [] },
		standards: { findings: [] },
		...overrides,
	}
}

function gateReport(overrides: Partial<Extract<TicketRunReport, { kind: "gate" }>> = {}) {
	const report: TicketRunReport = {
		kind: "gate",
		ticket: TICKET,
		title: TITLE,
		branch: BRANCH,
		base: BASE,
		rounds: [round()],
		reviews: GATE_REVIEWS,
		...overrides,
	}
	return report
}

function writeOf(plan: ReturnType<typeof planTicketRun>, kind: string) {
	return plan.writes.find((write) => write.kind === kind)
}

describe("starting a Ticket Run", () => {
	it("claims the Ticket and moves its card to In progress", () => {
		const writes = startTicketRun(TICKET, CLAIMED_AT_MS)

		expect(writes).toEqual([
			{ kind: "claim", issue: TICKET, claimedAtMs: CLAIMED_AT_MS },
			{ kind: "status", issue: TICKET, status: "In progress" },
		])
		expect(Object.isFrozen(writes)).toBe(true)
	})
})

describe("planning a Ticket Run", () => {
	it("asks for another Gate round without writing anything", () => {
		const plan = planTicketRun(gateReport({ rounds: [round({ checkPassed: false })] }))

		expect(plan).toEqual({ kind: "rerun", waiting: false, writes: [] })
	})

	it("opens a ready pull request labelled factory, releases the Claim and moves to In review", () => {
		const plan = planTicketRun(gateReport())

		expect(plan.kind).toBe("ready")
		expect(plan.writes.map((write) => write.kind)).toEqual(["pull-request", "label", "status"])
		const pullRequest = writeOf(plan, "pull-request")
		if (pullRequest?.kind !== "pull-request") throw new Error("expected a pull request")
		expect(pullRequest.draft).toBe(false)
		expect(pullRequest.title).toBe(TITLE)
		expect(pullRequest.head).toBe(BRANCH)
		expect(pullRequest.base).toBe(BASE)
		expect(pullRequest.body).toContain("Closes #9")
		expect(pullRequest.body).toContain("## Reviews")
		expect(pullRequest.body).toContain(
			"Conformance Review on claudeAgent/claude-sonnet-5-5: t3-thread://conformance-1 - no findings, 2 findings fixed",
		)
		expect(pullRequest.body).toContain(
			"Standards Review on antigravity/gemini-3.8-flash: t3-thread://standards-1 - no findings, 1 findings fixed",
		)
		expect(pullRequest.labels).toEqual(["factory"])
		expect(writeOf(plan, "label")).toEqual({
			kind: "label",
			issue: TICKET,
			label: "agent-working",
			present: false,
		})
		expect(writeOf(plan, "status")).toEqual({
			kind: "status",
			issue: TICKET,
			status: "In review",
		})
	})

	it("opens a draft pull request with the findings after two failed rounds", () => {
		const plan = planTicketRun(
			gateReport({
				rounds: [
					round({ conformance: { findings: ["The Claim is never released."] } }),
					round({ standards: { findings: ["The error field is an internal name."] } }),
				],
			}),
		)

		expect(plan.kind).toBe("gate-failure")
		const pullRequest = writeOf(plan, "pull-request")
		if (pullRequest?.kind !== "pull-request") throw new Error("expected a pull request")
		expect(pullRequest.draft).toBe(true)
		expect(pullRequest.body).toContain("Closes #9")
		expect(pullRequest.body).toContain("Standards Review: The error field is an internal name.")
		expect(pullRequest.labels).toEqual(["factory"])
		expect(plan.writes).toContainEqual({
			kind: "label",
			issue: TICKET,
			label: "ready-for-human",
			present: true,
		})
		expect(plan.writes).toContainEqual({
			kind: "label",
			issue: TICKET,
			label: "agent-working",
			present: false,
		})
		expect(writeOf(plan, "status")).toEqual({
			kind: "status",
			issue: TICKET,
			status: "In review",
		})
	})

	it("posts the spec-gap question, applies needs-info and releases the Claim", () => {
		const plan = planTicketRun({
			kind: "spec-gap",
			ticket: TICKET,
			question: "Which host should the Run use?",
		})

		expect(plan.kind).toBe("spec-gap")
		expect(plan.waiting).toBe(false)
		expect(plan.writes.map((write) => write.kind)).toEqual(["comment", "label", "label"])
		const comment = writeOf(plan, "comment")
		if (comment?.kind !== "comment") throw new Error("expected a comment")
		expect(comment.key).toStartWith("exit:spec-gap:which-host-should-the-run-use:")
		expect(comment.body).toContain("Which host should the Run use?")
		expect(plan.writes).toContainEqual({
			kind: "label",
			issue: TICKET,
			label: "needs-info",
			present: true,
		})
		expect(plan.writes).toContainEqual({
			kind: "label",
			issue: TICKET,
			label: "agent-working",
			present: false,
		})
	})

	it("posts each spec-gap question under its own comment key", () => {
		const prefix = "a".repeat(80)
		const questions = ["Which host should the Run use?", `${prefix} first`, `${prefix} second`]
		const keys = questions.map((question) => {
			const plan = planTicketRun({ kind: "spec-gap", ticket: TICKET, question })
			const comment = writeOf(plan, "comment")
			if (comment?.kind !== "comment") throw new Error("expected a spec-gap comment")
			return comment.key
		})

		expect(keys[0]).toStartWith("exit:spec-gap:which-host-should-the-run-use:")
		expect(new Set(keys).size).toBe(questions.length)
	})

	it("files a Follow-up Ticket and then continues to the ready pull request", () => {
		const followUp = planTicketRun({
			kind: "follow-up",
			ticket: TICKET,
			tickets: [
				{
					title: "Provision the release token",
					body: "Only the owner can create the release token.",
				},
			],
		})

		expect(followUp.kind).toBe("follow-up")
		expect(followUp.waiting).toBe(false)
		expect(followUp.writes.map((write) => write.kind)).toEqual(["follow-up"])
		expect(writeOf(followUp, "follow-up")).toEqual({
			kind: "follow-up",
			issue: TICKET,
			title: "Provision the release token",
			body: "Only the owner can create the release token.",
			labels: ["ready-for-human"],
		})

		const ready = planTicketRun(gateReport())
		expect(ready.kind).toBe("ready")
		expect(writeOf(ready, "pull-request")?.kind).toBe("pull-request")
	})

	it("leaves an urgent Run waiting and sends a notification", () => {
		const plan = planTicketRun({
			kind: "urgent",
			ticket: TICKET,
			reason: "The release token has expired.",
		})

		expect(plan.kind).toBe("urgent")
		expect(plan.waiting).toBe(true)
		expect(plan.writes).toEqual([])
		expect(plan.notification).toContain("trajectonomics/factory#9")
		expect(plan.notification).toContain("The release token has expired.")
	})

	it("returns a frozen plan that copies the Ticket key", () => {
		const report = gateReport()
		const plan = planTicketRun(report)
		const pullRequest = writeOf(plan, "pull-request")
		if (pullRequest === undefined) throw new Error("expected a pull request")

		expect(Object.isFrozen(plan)).toBe(true)
		expect(pullRequest.issue).not.toBe(TICKET)
		expect(Object.isFrozen(TICKET)).toBe(false)
	})
})

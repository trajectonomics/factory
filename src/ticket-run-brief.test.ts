import { describe, expect, it } from "bun:test"
import type { IssueKey } from "./contracts"
import { ticketRunBrief } from "./ticket-run-brief"

const TICKET: IssueKey = { repository: "trajectonomics/factory", number: 9 }

describe("the Ticket Run role brief", () => {
	it("names the Ticket and tells the implementer to use /implement", () => {
		const brief = ticketRunBrief(TICKET)

		expect(brief).toContain("trajectonomics/factory#9")
		expect(brief).toContain("/implement")
	})

	it("names the Gate checks and the two-round limit", () => {
		const brief = ticketRunBrief(TICKET)

		expect(brief).toContain("bun run check")
		expect(brief).toContain("Conformance Review")
		expect(brief).toContain("Standards Review")
		expect(brief).toContain("at most two rounds")
	})

	it("names the pull request, its factory label and Closes #9", () => {
		const brief = ticketRunBrief(TICKET)

		expect(brief).toContain("ready pull request")
		expect(brief).toContain("factory")
		expect(brief).toContain("Closes #9")
	})

	it("names the spec-gap, follow-up and urgent Exits", () => {
		const brief = ticketRunBrief(TICKET)

		expect(brief).toContain("spec gap")
		expect(brief).toContain("ready-for-human")
		expect(brief).toContain("urgent Exit")
	})
})

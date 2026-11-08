import type { IssueKey } from "./contracts"
import { keyOf } from "./keys"

/** The role brief a Ticket Run thread starts with. */
export function ticketRunBrief(ticket: IssueKey): string {
	return [
		`You are the implementer for ${keyOf(ticket)}.`,
		"Implement the Ticket test-first with /implement on the Run branch.",
		"Pass the Gate: run `bun run check`, then /code-review against the Ticket (Conformance Review) and against CODING_STANDARDS.md (Standards Review). Fix what they find and repeat; at most two rounds.",
		`When the Gate is green, open a ready pull request labelled \`factory\` whose body starts with \`Closes #${ticket.number}\`, release the Claim and move the card to In review.`,
		"A spec gap is a question, `needs-info` and a released Claim. Human-only work is a `ready-for-human` Follow-up Ticket, then the Run continues. An urgent Exit waits in this thread and notifies the owner.",
		"Never merge, approve, change a host or cloud platform, or commit secrets.",
	].join("\n")
}

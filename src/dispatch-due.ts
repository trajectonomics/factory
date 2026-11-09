import type { EligibleRun } from "./contracts"
import { deepFreeze } from "./freeze"
import { keyOf } from "./keys"

/** The Run with rate-limited Tickets removed, or undefined when all of it waits. */
export function dueRun(run: EligibleRun, waiting: ReadonlySet<string>): EligibleRun | undefined {
	if (run.kind === "ticket-run") return waiting.has(keyOf(run.ticket)) ? undefined : run
	const tickets = run.tickets.filter((ticket) => !waiting.has(keyOf(ticket)))
	if (tickets.length === 0) return undefined
	return tickets.length === run.tickets.length ? run : deepFreeze({ ...run, tickets })
}

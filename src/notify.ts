import type { TicketRunPlan } from "./ticket-run-contracts"

/** Delivers an urgent Exit to the owner. */
export type Notifier = (notification: string) => Promise<void>

/** Sends the notification an urgent Ticket Run plan carries, if it has one. */
export async function sendTicketRunNotification(
	notifier: Notifier,
	plan: TicketRunPlan,
): Promise<void> {
	if (plan.notification === undefined) return
	await notifier(plan.notification)
}

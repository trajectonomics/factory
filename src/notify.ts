import { planTicketRun } from "./ticket-run"
import type { TicketRunPlan, TicketRunReport } from "./ticket-run-contracts"

/** Delivers an urgent Exit to the owner. */
export type Notifier = (notification: string) => Promise<void>

/** Plans a Ticket Run and sends its urgent notification, when it has one. */
export async function planAndNotifyTicketRun(
	notifier: Notifier,
	report: TicketRunReport,
): Promise<TicketRunPlan> {
	const plan = planTicketRun(report)
	await sendTicketRunNotification(notifier, plan)
	return plan
}

/** Sends the notification an urgent Ticket Run plan carries, if it has one. */
export async function sendTicketRunNotification(
	notifier: Notifier,
	plan: TicketRunPlan,
): Promise<void> {
	if (plan.notification === undefined) return
	await notifier(plan.notification)
}

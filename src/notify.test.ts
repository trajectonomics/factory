import { describe, expect, it } from "bun:test"
import { type Notifier, planAndNotifyTicketRun, sendTicketRunNotification } from "./notify"
import type { TicketRunPlan } from "./ticket-run-contracts"

const URGENT_MESSAGE = "Ticket Run for trajectonomics/factory#9 needs the owner: The token expired."

const URGENT: TicketRunPlan = {
	kind: "urgent",
	waiting: true,
	writes: [],
	notification: URGENT_MESSAGE,
}

const READY: TicketRunPlan = { kind: "ready", waiting: false, writes: [] }

describe("urgent Ticket Run notifications", () => {
	it("sends the notification an urgent plan carries", async () => {
		const sent: string[] = []
		const notifier: Notifier = async (notification) => {
			sent.push(notification)
		}

		await sendTicketRunNotification(notifier, URGENT)

		expect(sent).toEqual([URGENT_MESSAGE])
	})

	it("plans and sends the notification in one call", async () => {
		const sent: string[] = []
		const notifier: Notifier = async (notification) => {
			sent.push(notification)
		}

		const plan = await planAndNotifyTicketRun(notifier, {
			kind: "urgent",
			ticket: { repository: "trajectonomics/factory", number: 9 },
			reason: "The token expired.",
		})

		expect(plan.kind).toBe("urgent")
		expect(plan.waiting).toBe(true)
		expect(sent).toHaveLength(1)
		expect(sent[0]).toContain("The token expired.")
	})

	it("sends nothing for a plan without a notification", async () => {
		let calls = 0
		const notifier: Notifier = async () => {
			calls++
		}

		await sendTicketRunNotification(notifier, READY)

		expect(calls).toBe(0)
	})
})

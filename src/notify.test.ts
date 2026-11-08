import { describe, expect, it } from "bun:test"
import { type Notifier, sendTicketRunNotification } from "./notify"
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

	it("sends nothing for a plan without a notification", async () => {
		let calls = 0
		const notifier: Notifier = async () => {
			calls++
		}

		await sendTicketRunNotification(notifier, READY)

		expect(calls).toBe(0)
	})
})

import { describe, expect, it } from "bun:test"
import { CLAIM_LEASE_MS } from "./claim"
import { planDispatch } from "./dispatch-plan"
import { approved, config, host, key, NOW_MS, reading, state } from "./fixtures/dispatch"

const STALE_LABELS = ["ready-for-agent", "agent-working"]
describe("a Dispatcher plan", () => {
	it("claims an approved Ticket and plans its Run within the Guards", () => {
		const plan = planDispatch(reading({ state: state([approved(4)]) }), config())

		expect(plan.launches[0]).toMatchObject({
			host: "homeserver2",
			request: { title: "traj/trajectonomics/cli#4", branch: "factory/4-ticket-4" },
		})
		expect(plan.claims).toEqual([
			{ kind: "claim", issue: key(4), claimedAtMs: NOW_MS },
			{ kind: "status", issue: key(4), status: "In progress" },
		])
		expect(plan.deferrals).toEqual([])
	})

	it("releases a stale Claim but launches nothing while the queue is too deep", () => {
		const plan = planDispatch(
			reading({
				state: state([
					approved(4, {
						labels: STALE_LABELS,
						claim: { claimedAtMs: NOW_MS - CLAIM_LEASE_MS - 1 },
					}),
				]),
				humanQueue: { openPullRequests: 7, needsSpecReview: 0, readyForHuman: 0 },
			}),
			config(),
		)

		expect(plan.launches).toEqual([])
		expect(plan.deferrals).toEqual([{ issue: key(4), reason: "queue-too-deep" }])
		expect(plan.writes).toEqual([
			{ kind: "label", issue: key(4), label: "agent-working", present: false },
		])
	})
})
describe("host Guards", () => {
	it("falls back to the other host that has the repository", () => {
		const plan = planDispatch(
			reading({
				state: state([approved(4)]),
				hosts: [host({ readiness: "pending" }), host({ host: "homeserver1" })],
			}),
			config(),
		)

		expect(plan.launches[0]).toMatchObject({ host: "homeserver1", fallback: true })
	})
})

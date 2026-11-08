import { describe, expect, it } from "bun:test"
import {
	type IssueKey,
	type IssueState,
	type RepositoryState,
	type RunFailure,
	reconcileWork,
} from "./index"

const NOW_MS = 1_000_000_000
const CLI = "trajectonomics/cli"
const LEASE_MS = 2 * 60 * 60 * 1000
const MINUTE_MS = 60 * 1000

function key(number: number): IssueKey {
	return { repository: CLI, number }
}

function issue(number: number, overrides: Partial<IssueState> = {}): IssueState {
	return {
		key: key(number),
		kind: "ticket",
		status: "open",
		labels: [],
		blockers: [],
		...overrides,
	}
}

function state(issues: IssueState[], liveThreads: IssueKey[] = []): RepositoryState {
	return { issues, liveThreads }
}

function failure(cause: RunFailure["cause"], failedAtMs: number): RunFailure {
	return { cause, failedAtMs }
}

describe("Claim reconciliation", () => {
	it("releases a Claim no live thread has held past its Lease", () => {
		const ticket = issue(4, { claim: { claimedAtMs: NOW_MS - LEASE_MS } })

		const plan = reconcileWork(state([ticket]), NOW_MS)

		expect(plan.releasedClaims).toEqual([{ issue: key(4), reason: "lease-expired" }])
		expect(plan.escalatedTickets).toEqual([])
		expect(plan.requeuedTickets).toEqual([])
	})

	it("keeps a Claim inside its Lease", () => {
		const ticket = issue(4, { claim: { claimedAtMs: NOW_MS - LEASE_MS + 1 } })

		const plan = reconcileWork(state([ticket]), NOW_MS)

		expect(plan).toEqual({ releasedClaims: [], escalatedTickets: [], requeuedTickets: [] })
	})

	it("keeps a Claim whose issue has a live thread past its Lease", () => {
		const ticket = issue(4, { claim: { claimedAtMs: NOW_MS - LEASE_MS - 1 } })

		const plan = reconcileWork(state([ticket], [key(4)]), NOW_MS)

		expect(plan).toEqual({ releasedClaims: [], escalatedTickets: [], requeuedTickets: [] })
	})

	it("never releases a label-only agent-working Claim", () => {
		const ticket = issue(4, { labels: ["agent-working"] })

		const plan = reconcileWork(state([ticket]), NOW_MS)

		expect(plan).toEqual({ releasedClaims: [], escalatedTickets: [], requeuedTickets: [] })
	})

	it("escalates a Ticket after its second failed attempt", () => {
		const ticket = issue(4, {
			runFailures: [failure("failed", NOW_MS - 120 * MINUTE_MS), failure("failed", NOW_MS)],
		})

		const plan = reconcileWork(state([ticket]), NOW_MS)

		expect(plan.escalatedTickets).toEqual([
			{ issue: key(4), reason: "attempts-exhausted", label: "ready-for-human" },
		])
	})

	it("keeps a Ticket with one failed attempt", () => {
		const ticket = issue(4, { runFailures: [failure("failed", NOW_MS)] })

		const plan = reconcileWork(state([ticket]), NOW_MS)

		expect(plan.escalatedTickets).toEqual([])
	})

	it("does not escalate a Ticket that is already ready-for-human", () => {
		const ticket = issue(4, {
			labels: ["ready-for-human"],
			runFailures: [failure("failed", NOW_MS - 1), failure("failed", NOW_MS)],
		})

		const plan = reconcileWork(state([ticket]), NOW_MS)

		expect(plan.escalatedTickets).toEqual([])
	})

	it("re-queues a rate-limited Ticket with a backoff", () => {
		const failedAtMs = NOW_MS - 5 * MINUTE_MS
		const ticket = issue(4, { runFailures: [failure("provider-rate-limit", failedAtMs)] })

		const plan = reconcileWork(state([ticket]), NOW_MS)

		expect(plan.requeuedTickets).toEqual([
			{
				issue: key(4),
				reason: "provider-rate-limit",
				retryAtMs: failedAtMs + 15 * MINUTE_MS,
			},
		])
	})

	it("does not count a provider rate-limit as a failed attempt", () => {
		const ticket = issue(4, {
			runFailures: [
				failure("failed", NOW_MS - 10 * MINUTE_MS),
				failure("provider-rate-limit", NOW_MS - 5 * MINUTE_MS),
			],
		})

		const plan = reconcileWork(state([ticket]), NOW_MS)

		expect(plan.escalatedTickets).toEqual([])
		expect(plan.requeuedTickets).toHaveLength(1)
	})

	it("escalates an exhausted Ticket even when its latest Run was rate-limited", () => {
		const ticket = issue(4, {
			runFailures: [
				failure("failed", NOW_MS - 30 * MINUTE_MS),
				failure("failed", NOW_MS - 20 * MINUTE_MS),
				failure("provider-rate-limit", NOW_MS - 5 * MINUTE_MS),
			],
		})

		const plan = reconcileWork(state([ticket]), NOW_MS)

		expect(plan.escalatedTickets).toHaveLength(1)
		expect(plan.requeuedTickets).toEqual([])
	})

	it("uses the latest failure regardless of the order it is read in", () => {
		const ticket = issue(4, {
			runFailures: [
				failure("failed", NOW_MS - 5 * MINUTE_MS),
				failure("provider-rate-limit", NOW_MS - 30 * MINUTE_MS),
			],
		})

		const plan = reconcileWork(state([ticket]), NOW_MS)

		expect(plan.requeuedTickets).toEqual([])
	})

	it("does not escalate or re-queue a closed Ticket", () => {
		const exhausted = issue(4, {
			status: "closed",
			runFailures: [failure("failed", NOW_MS - 1), failure("failed", NOW_MS)],
		})
		const rateLimited = issue(5, {
			status: "closed",
			runFailures: [failure("provider-rate-limit", NOW_MS)],
		})

		const plan = reconcileWork(state([exhausted, rateLimited]), NOW_MS)

		expect(plan.escalatedTickets).toEqual([])
		expect(plan.requeuedTickets).toEqual([])
	})

	it("does not re-queue a Ticket already labelled ready-for-human", () => {
		const ticket = issue(4, {
			labels: ["ready-for-human"],
			runFailures: [failure("provider-rate-limit", NOW_MS)],
		})

		const plan = reconcileWork(state([ticket]), NOW_MS)

		expect(plan.requeuedTickets).toEqual([])
	})

	it("does not re-queue a Claim started after the rate-limit", () => {
		const ticket = issue(4, {
			claim: { claimedAtMs: NOW_MS - 5 * MINUTE_MS },
			runFailures: [failure("provider-rate-limit", NOW_MS - 10 * MINUTE_MS)],
		})

		const plan = reconcileWork(state([ticket]), NOW_MS)

		expect(plan).toEqual({ releasedClaims: [], escalatedTickets: [], requeuedTickets: [] })
	})

	it("releases a stale Claim and escalates the exhausted Ticket that held it", () => {
		const ticket = issue(4, {
			claim: { claimedAtMs: NOW_MS - LEASE_MS },
			runFailures: [failure("failed", NOW_MS - 180 * MINUTE_MS), failure("failed", NOW_MS)],
		})

		const plan = reconcileWork(state([ticket]), NOW_MS)

		expect(plan.releasedClaims).toEqual([{ issue: key(4), reason: "lease-expired" }])
		expect(plan.escalatedTickets).toHaveLength(1)
	})

	it("ignores a live thread even when the Ticket has failed attempts and a stale Claim", () => {
		const ticket = issue(4, {
			claim: { claimedAtMs: NOW_MS - LEASE_MS },
			runFailures: [failure("failed", NOW_MS - 1), failure("failed", NOW_MS)],
		})

		const plan = reconcileWork(state([ticket], [key(4)]), NOW_MS)

		expect(plan).toEqual({ releasedClaims: [], escalatedTickets: [], requeuedTickets: [] })
	})

	it("returns the same decisions for either order of its input", () => {
		const first = issue(4, { claim: { claimedAtMs: NOW_MS - LEASE_MS } })
		const second = issue(5, { runFailures: [failure("provider-rate-limit", NOW_MS)] })

		const forward = reconcileWork(state([first, second]), NOW_MS)
		const backward = reconcileWork(state([second, first]), NOW_MS)

		expect(forward).toEqual(backward)
		expect(forward.releasedClaims).toEqual([{ issue: key(4), reason: "lease-expired" }])
		expect(forward.requeuedTickets.map((entry) => entry.issue)).toEqual([key(5)])
	})

	it("returns frozen decisions with copied issue keys", () => {
		const ticket = issue(4, { claim: { claimedAtMs: NOW_MS - LEASE_MS } })

		const plan = reconcileWork(state([ticket]), NOW_MS)

		expect(Object.isFrozen(plan)).toBe(true)
		expect(Object.isFrozen(plan.releasedClaims)).toBe(true)
		expect(Object.isFrozen(plan.releasedClaims[0])).toBe(true)
		expect(plan.releasedClaims[0]?.issue).not.toBe(ticket.key)
	})
})

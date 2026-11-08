import { describe, expect, it } from "bun:test"
import {
	type IssueKey,
	type IssueState,
	type ReconciliationPlan,
	type RepositoryState,
	type RunFailure,
	reconcileWork,
} from "./index"

const NOW_MS = 1_000_000_000
const CLI = "trajectonomics/cli"
const LEASE_MS = 2 * 60 * 60 * 1000
const MINUTE_MS = 60 * 1000
const NO_DECISIONS: ReconciliationPlan = {
	releasedClaims: [],
	escalatedTickets: [],
	requeuedTickets: [],
}

function key(number: number): IssueKey {
	return { repository: CLI, number }
}

function issue(number: number, overrides: Partial<IssueState> = {}): IssueState {
	return {
		key: key(number),
		kind: "ticket",
		status: "open",
		labels: ["ready-for-agent"],
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

function expectNoDecisions(plan: ReconciliationPlan): void {
	expect(plan).toEqual(NO_DECISIONS)
}

describe("Claim reconciliation edges", () => {
	it("releases a stale Claim and escalates the exhausted Ticket that held it", () => {
		const ticket = issue(4, {
			claim: { claimedAtMs: NOW_MS - LEASE_MS },
			runFailures: [failure("failed", NOW_MS - 180 * MINUTE_MS), failure("failed", NOW_MS)],
		})

		const plan = reconcileWork(state([ticket]), NOW_MS)

		expect(plan.releasedClaims).toEqual([{ issue: key(4), reason: "lease-expired" }])
		expect(plan.escalatedTickets).toHaveLength(1)
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

		expectNoDecisions(reconcileWork(state([exhausted, rateLimited]), NOW_MS))
	})

	it("does not re-queue a live-threaded Ticket", () => {
		const ticket = issue(4, { runFailures: [failure("provider-rate-limit", NOW_MS)] })

		expectNoDecisions(reconcileWork(state([ticket], [key(4)]), NOW_MS))
	})

	it("re-queues when the Claim started exactly when the Run failed", () => {
		const failedAtMs = NOW_MS - MINUTE_MS
		const ticket = issue(4, {
			claim: { claimedAtMs: failedAtMs },
			runFailures: [failure("provider-rate-limit", failedAtMs)],
		})

		const plan = reconcileWork(state([ticket]), NOW_MS)

		expect(plan.releasedClaims).toEqual([])
		expect(plan.requeuedTickets).toHaveLength(1)
	})

	it("re-queues a rate-limited Ticket whose older Claim is also stale", () => {
		const ticket = issue(4, {
			claim: { claimedAtMs: NOW_MS - 3 * 60 * MINUTE_MS },
			runFailures: [failure("provider-rate-limit", NOW_MS - 60 * MINUTE_MS)],
		})

		const plan = reconcileWork(state([ticket]), NOW_MS)

		expect(plan.releasedClaims).toEqual([])
		expect(plan.requeuedTickets).toHaveLength(1)
	})

	it("releases the stale Claim of a retry started after the rate-limit", () => {
		const ticket = issue(4, {
			claim: { claimedAtMs: NOW_MS - 3 * 60 * MINUTE_MS },
			runFailures: [failure("provider-rate-limit", NOW_MS - 4 * 60 * MINUTE_MS)],
		})

		const plan = reconcileWork(state([ticket]), NOW_MS)

		expect(plan.releasedClaims).toEqual([{ issue: key(4), reason: "lease-expired" }])
		expect(plan.requeuedTickets).toEqual([])
	})

	it("uses the latest failure regardless of the order it is read in", () => {
		const ticket = issue(4, {
			runFailures: [
				failure("failed", NOW_MS - 5 * MINUTE_MS),
				failure("provider-rate-limit", NOW_MS - 30 * MINUTE_MS),
			],
		})

		expectNoDecisions(reconcileWork(state([ticket]), NOW_MS))
	})

	it("lets a failed attempt win a same-timestamp tie with a rate-limit", () => {
		const failedAtMs = NOW_MS - MINUTE_MS
		const first = issue(4, {
			runFailures: [failure("provider-rate-limit", failedAtMs), failure("failed", failedAtMs)],
		})
		const second = issue(4, {
			runFailures: [failure("failed", failedAtMs), failure("provider-rate-limit", failedAtMs)],
		})

		expectNoDecisions(reconcileWork(state([first]), NOW_MS))
		expectNoDecisions(reconcileWork(state([second]), NOW_MS))
	})

	it("escalates and re-queues only Tickets, never a Spec", () => {
		const spec = issue(4, {
			kind: "spec",
			runFailures: [
				failure("failed", NOW_MS - 2),
				failure("failed", NOW_MS - 1),
				failure("provider-rate-limit", NOW_MS),
			],
		})

		expectNoDecisions(reconcileWork(state([spec]), NOW_MS))
	})

	it("does not re-queue a Claim started after the rate-limit", () => {
		const ticket = issue(4, {
			claim: { claimedAtMs: NOW_MS - 5 * MINUTE_MS },
			runFailures: [failure("provider-rate-limit", NOW_MS - 10 * MINUTE_MS)],
		})

		expectNoDecisions(reconcileWork(state([ticket]), NOW_MS))
	})
})

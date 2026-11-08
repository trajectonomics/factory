import { describe, expect, it } from "bun:test"
import {
	EligibilityError,
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

function reconciliationError(run: () => void): EligibilityError | undefined {
	try {
		run()
	} catch (error) {
		return error instanceof EligibilityError ? error : undefined
	}
	return undefined
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

		expectNoDecisions(reconcileWork(state([ticket]), NOW_MS))
	})

	it("keeps a Claim whose issue has a live thread past its Lease", () => {
		const ticket = issue(4, { claim: { claimedAtMs: NOW_MS - LEASE_MS - 1 } })

		expectNoDecisions(reconcileWork(state([ticket], [key(4)]), NOW_MS))
	})

	it("never releases a label-only agent-working Claim", () => {
		const ticket = issue(4, { labels: ["agent-working"] })

		expectNoDecisions(reconcileWork(state([ticket]), NOW_MS))
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

		expect(reconcileWork(state([ticket]), NOW_MS).escalatedTickets).toEqual([])
	})

	it("does not escalate a Ticket that is already ready-for-human", () => {
		const ticket = issue(4, {
			labels: ["ready-for-agent", "ready-for-human"],
			runFailures: [failure("failed", NOW_MS - 1), failure("failed", NOW_MS)],
		})

		expect(reconcileWork(state([ticket]), NOW_MS).escalatedTickets).toEqual([])
	})

	it("re-queues an approved rate-limited Ticket with a backoff", () => {
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

	it("does not re-queue an unapproved rate-limited Ticket", () => {
		const ticket = issue(4, {
			labels: [],
			runFailures: [failure("provider-rate-limit", NOW_MS)],
		})

		expectNoDecisions(reconcileWork(state([ticket]), NOW_MS))
	})

	for (const label of ["needs-info", "wontfix", "ready-for-human"]) {
		it(`does not re-queue an approved Ticket labelled ${label}`, () => {
			const ticket = issue(4, {
				labels: ["ready-for-agent", label],
				runFailures: [failure("provider-rate-limit", NOW_MS)],
			})

			expectNoDecisions(reconcileWork(state([ticket]), NOW_MS))
		})
	}

	it("ignores a live thread even when the Ticket has failed attempts and a stale Claim", () => {
		const ticket = issue(4, {
			claim: { claimedAtMs: NOW_MS - LEASE_MS },
			runFailures: [failure("failed", NOW_MS - 1), failure("failed", NOW_MS)],
		})

		expectNoDecisions(reconcileWork(state([ticket], [key(4)]), NOW_MS))
	})

	it("rejects a repository state that lists one issue twice", () => {
		const first = issue(4, { claim: { claimedAtMs: NOW_MS - LEASE_MS } })
		const second = issue(4, { runFailures: [failure("failed", NOW_MS)] })

		const error = reconciliationError(() => reconcileWork(state([first, second]), NOW_MS))

		expect(error?.code).toBe("duplicate-issue-key")
		expect(error?.field).toBe("issues[trajectonomics/cli#4]")
	})
})

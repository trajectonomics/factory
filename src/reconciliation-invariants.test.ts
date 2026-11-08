import { describe, expect, it } from "bun:test"
import {
	type IssueKey,
	type IssueState,
	type ReconciliationPlan,
	type RepositoryState,
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
		labels: ["ready-for-agent"],
		blockers: [],
		...overrides,
	}
}

function state(issues: IssueState[], liveThreads: IssueKey[] = []): RepositoryState {
	return { issues, liveThreads }
}

function fixture(): IssueState[] {
	return [
		issue(4, { claim: { claimedAtMs: NOW_MS - LEASE_MS } }),
		issue(5, {
			runFailures: [
				{ cause: "failed", failedAtMs: NOW_MS - 2 * MINUTE_MS },
				{ cause: "failed", failedAtMs: NOW_MS - MINUTE_MS },
			],
		}),
		issue(6, {
			runFailures: [{ cause: "provider-rate-limit", failedAtMs: NOW_MS - 5 * MINUTE_MS }],
		}),
		issue(7, { runFailures: [{ cause: "provider-rate-limit", failedAtMs: NOW_MS }] }),
		issue(8, { kind: "spec", runFailures: [{ cause: "provider-rate-limit", failedAtMs: NOW_MS }] }),
	]
}

function permutations<T>(items: readonly T[]): T[][] {
	if (items.length <= 1) return [[...items]]
	return items.flatMap((item, index) => {
		const rest = [...items.slice(0, index), ...items.slice(index + 1)]
		return permutations(rest).map((ordering) => [item, ...ordering])
	})
}

const EXPECTED: ReconciliationPlan = {
	releasedClaims: [{ issue: key(4), reason: "lease-expired" }],
	handedOffTickets: [{ issue: key(5), reason: "attempts-exhausted", label: "ready-for-human" }],
	requeuedTickets: [
		{
			issue: key(6),
			reason: "provider-rate-limit",
			retryAtMs: NOW_MS + 10 * MINUTE_MS,
		},
	],
}

describe("reconciliation invariants", () => {
	it("returns the same decisions for every order the repository state can arrive in", () => {
		for (const ordering of permutations(fixture())) {
			expect(reconcileWork(state(ordering, [key(7)]), NOW_MS)).toEqual(EXPECTED)
		}
	})

	it("returns frozen decisions", () => {
		const plan = reconcileWork(state(fixture(), [key(7)]), NOW_MS)

		expect(Object.isFrozen(plan)).toBe(true)
		expect(Object.isFrozen(plan.releasedClaims)).toBe(true)
		expect(Object.isFrozen(plan.releasedClaims[0])).toBe(true)
	})

	it("copies issue keys into its decisions instead of freezing the caller's objects", () => {
		const issues = fixture()
		const plan = reconcileWork(state(issues, [key(7)]), NOW_MS)
		const claimed = issues[0]

		if (claimed === undefined) throw new Error("fixture shape changed")

		expect(plan.releasedClaims[0]?.issue).not.toBe(claimed.key)
		expect(plan.releasedClaims[0]?.issue).toEqual(claimed.key)
		expect(Object.isFrozen(claimed.key)).toBe(false)
	})
})

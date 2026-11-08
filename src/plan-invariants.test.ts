import { describe, expect, it } from "bun:test"
import {
	type Allowlist,
	type EligibilityPlan,
	evaluateEligibility,
	type IssueKey,
	type IssueState,
	type RepositoryState,
} from "./index"

const NOW_MS = 1_000_000_000
const CLI = "trajectonomics/cli"
const ALLOWLIST: Allowlist = [{ repository: CLI, host: "homeserver2" }]
const SPEC = key(2)

function key(number: number, repository = CLI): IssueKey {
	return { repository, number }
}

function issue(issueKey: IssueKey, overrides: Partial<IssueState> = {}): IssueState {
	const base: IssueState = {
		key: issueKey,
		kind: "ticket",
		status: "open",
		labels: [],
		blockers: [],
	}
	return { ...base, ...overrides }
}

function fixture(): IssueState[] {
	return [
		issue(key(2), { kind: "spec", labels: ["ready-for-agent"] }),
		issue(key(3), { parentSpec: SPEC }),
		issue(key(4), { parentSpec: SPEC, labels: ["ready-for-human"] }),
		issue(key(5), { kind: "spec" }),
		issue(key(10), { labels: ["ready-for-agent"] }),
		issue(key(11, "trajectonomics/ledger-core"), { labels: ["ready-for-agent"] }),
	]
}

function state(issues: IssueState[]): RepositoryState {
	return { issues, liveThreads: [] }
}

function permutations<T>(items: readonly T[]): T[][] {
	if (items.length <= 1) return [[...items]]
	return items.flatMap((item, index) => {
		const rest = [...items.slice(0, index), ...items.slice(index + 1)]
		return permutations(rest).map((ordering) => [item, ...ordering])
	})
}

function deepFreeze<T>(value: T): T {
	if (typeof value !== "object" || value === null) return value
	for (const nested of Object.values(value)) deepFreeze(nested)
	return Object.freeze(value) as T
}

const EXPECTED: EligibilityPlan = {
	runs: [
		{ kind: "spec-run", spec: SPEC, tickets: [key(3)], host: "homeserver2" },
		{ kind: "ticket-run", ticket: key(10), host: "homeserver2" },
	],
	skipped: [
		{ issue: key(4), reason: { code: "needs-human" } },
		{ issue: key(5), reason: { code: "not-approved" } },
		{
			issue: key(11, "trajectonomics/ledger-core"),
			reason: { code: "repository-not-allowlisted" },
		},
	],
}

describe("eligibility plan invariants", () => {
	it("returns the same decisions for every order the repository state can arrive in", () => {
		for (const ordering of permutations(fixture())) {
			expect(evaluateEligibility(state(ordering), ALLOWLIST, NOW_MS)).toEqual(EXPECTED)
		}
	})

	it("never mutates the repository state it is given", () => {
		const frozen = deepFreeze(state(fixture()))

		expect(Object.isFrozen(frozen.issues[0]?.key)).toBe(true)
		expect(() => evaluateEligibility(frozen, ALLOWLIST, NOW_MS)).not.toThrow()
	})

	it("copies issue keys into its decisions instead of freezing the caller's objects", () => {
		const issues = fixture()
		const plan = evaluateEligibility(state(issues), ALLOWLIST, NOW_MS)
		const spec = issues.find((entry) => entry.kind === "spec" && entry.labels.length > 0)
		const child = issues.find((entry) => entry.key.number === 3)
		const ticket = issues.find((entry) => entry.key.number === 10)
		const specRun = plan.runs.find((run) => run.kind === "spec-run")
		const ticketRun = plan.runs.find((run) => run.kind === "ticket-run")
		if (spec === undefined || child === undefined || ticket === undefined) {
			throw new Error("fixture shape changed")
		}
		if (specRun?.kind !== "spec-run" || ticketRun?.kind !== "ticket-run") {
			throw new Error("expected both Run kinds")
		}

		expect(specRun.spec).not.toBe(spec.key)
		expect(specRun.tickets[0]).not.toBe(child.key)
		expect(ticketRun.ticket).not.toBe(ticket.key)
		expect(Object.isFrozen(spec.key)).toBe(false)
		expect(Object.isFrozen(ticket.key)).toBe(false)
	})

	it("copies blocker keys in skip reasons", () => {
		const blocker = key(9)
		const ticket = issue(key(4), {
			labels: ["ready-for-agent"],
			blockers: [{ key: blocker, status: "open" }],
		})

		const plan = evaluateEligibility(state([ticket]), ALLOWLIST, NOW_MS)
		const reason = plan.skipped[0]?.reason
		if (reason?.code !== "open-blocker") throw new Error("expected an open blocker")

		expect(reason.blockers[0]).not.toBe(blocker)
		expect(reason.blockers[0]).toEqual(blocker)
	})

	it("returns frozen decisions", () => {
		const plan = evaluateEligibility(state(fixture()), ALLOWLIST, NOW_MS)

		expect(Object.isFrozen(plan)).toBe(true)
		expect(Object.isFrozen(plan.runs)).toBe(true)
		expect(Object.isFrozen(plan.skipped)).toBe(true)
		expect(Object.isFrozen(plan.runs[0])).toBe(true)
	})
})

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
		issue(SPEC, { kind: "spec", labels: ["ready-for-agent"] }),
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
		const issues = fixture().map((entry) => Object.freeze(entry))
		const frozen = Object.freeze({
			issues: Object.freeze(issues),
			liveThreads: Object.freeze([]),
		})

		expect(() => evaluateEligibility(frozen, ALLOWLIST, NOW_MS)).not.toThrow()
	})

	it("returns frozen decisions", () => {
		const plan = evaluateEligibility(state(fixture()), ALLOWLIST, NOW_MS)

		expect(Object.isFrozen(plan)).toBe(true)
		expect(Object.isFrozen(plan.runs)).toBe(true)
		expect(Object.isFrozen(plan.skipped)).toBe(true)
		expect(Object.isFrozen(plan.runs[0])).toBe(true)
	})
})

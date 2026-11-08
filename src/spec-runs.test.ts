import { describe, expect, it } from "bun:test"
import {
	type Allowlist,
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
	return { key: issueKey, kind: "ticket", status: "open", labels: [], blockers: [], ...overrides }
}

function spec(overrides: Partial<IssueState> = {}): IssueState {
	return issue(SPEC, { kind: "spec", labels: ["ready-for-agent"], ...overrides })
}

function child(number: number, overrides: Partial<IssueState> = {}): IssueState {
	return issue(key(number), { parentSpec: SPEC, ...overrides })
}

function state(issues: IssueState[]): RepositoryState {
	return { issues, liveThreads: [] }
}

describe("Spec Runs", () => {
	it("yields one Spec Run covering the open children of an approved parent Spec", () => {
		const plan = evaluateEligibility(
			state([
				spec(),
				child(3),
				child(4, { labels: ["ready-for-agent"] }),
				child(5, { status: "closed" }),
			]),
			ALLOWLIST,
			NOW_MS,
		)

		expect(plan.runs).toEqual([
			{ kind: "spec-run", spec: SPEC, tickets: [key(3), key(4)], host: "homeserver2" },
		])
		expect(plan.skipped).toEqual([{ issue: key(5), reason: { code: "closed" } }])
	})

	it("skips a child that needs human-only work without stopping the Spec Run", () => {
		const plan = evaluateEligibility(
			state([spec(), child(3), child(4, { labels: ["ready-for-human"] })]),
			ALLOWLIST,
			NOW_MS,
		)

		expect(plan.runs).toEqual([
			{ kind: "spec-run", spec: SPEC, tickets: [key(3)], host: "homeserver2" },
		])
		expect(plan.skipped).toEqual([{ issue: key(4), reason: { code: "needs-human" } }])
	})

	it("orders a child blocked by a sibling inside the Spec Run instead of skipping it", () => {
		const plan = evaluateEligibility(
			state([spec(), child(3), child(4, { blockers: [{ key: key(3), status: "open" }] })]),
			ALLOWLIST,
			NOW_MS,
		)

		expect(plan.runs).toEqual([
			{ kind: "spec-run", spec: SPEC, tickets: [key(3), key(4)], host: "homeserver2" },
		])
		expect(plan.skipped).toEqual([])
	})

	it("skips a child blocked by a Ticket outside the Spec", () => {
		const external = key(9, "trajectonomics/sim-core")
		const plan = evaluateEligibility(
			state([spec(), child(3), child(4, { blockers: [{ key: external, status: "open" }] })]),
			ALLOWLIST,
			NOW_MS,
		)

		expect(plan.runs).toEqual([
			{ kind: "spec-run", spec: SPEC, tickets: [key(3)], host: "homeserver2" },
		])
		expect(plan.skipped).toEqual([
			{ issue: key(4), reason: { code: "open-blocker", blockers: [external] } },
		])
	})

	it("skips a child that a live Claim already holds", () => {
		const plan = evaluateEligibility(
			state([spec(), child(3), child(4, { claim: { claimedAtMs: NOW_MS - 60 * 60 * 1000 } })]),
			ALLOWLIST,
			NOW_MS,
		)

		expect(plan.runs).toEqual([
			{ kind: "spec-run", spec: SPEC, tickets: [key(3)], host: "homeserver2" },
		])
		expect(plan.skipped).toEqual([{ issue: key(4), reason: { code: "live-claim" } }])
	})

	it("skips a Spec with a live Claim and leaves its children waiting on it", () => {
		const claimed = spec({ claim: { claimedAtMs: NOW_MS - 60 * 60 * 1000 } })
		const plan = evaluateEligibility(state([claimed, child(3)]), ALLOWLIST, NOW_MS)

		expect(plan.runs).toEqual([])
		expect(plan.skipped).toEqual([
			{ issue: SPEC, reason: { code: "live-claim" } },
			{ issue: key(3), reason: { code: "parent-spec-not-eligible", spec: SPEC } },
		])
	})

	it("skips a Spec with an open blocker", () => {
		const blocker = key(9, "trajectonomics/sim-core")
		const plan = evaluateEligibility(
			state([spec({ blockers: [{ key: blocker, status: "open" }] })]),
			ALLOWLIST,
			NOW_MS,
		)

		expect(plan.runs).toEqual([])
		expect(plan.skipped).toEqual([
			{ issue: SPEC, reason: { code: "open-blocker", blockers: [blocker] } },
		])
	})
})

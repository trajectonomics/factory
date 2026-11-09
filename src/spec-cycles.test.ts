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

function key(number: number): IssueKey {
	return { repository: CLI, number }
}

function issue(issueKey: IssueKey, overrides: Partial<IssueState> = {}): IssueState {
	return { key: issueKey, kind: "ticket", status: "open", labels: [], blockers: [], ...overrides }
}

function spec(): IssueState {
	return issue(SPEC, { kind: "spec", labels: ["ready-for-agent"] })
}

function child(number: number, overrides: Partial<IssueState> = {}): IssueState {
	return issue(key(number), { parentSpec: SPEC, ...overrides })
}

function blocked(number: number, blocker: IssueKey): IssueState {
	return child(number, { blockers: [{ key: blocker, status: "open" }] })
}

function state(issues: IssueState[]): RepositoryState {
	return { issues, liveThreads: [] }
}

describe("Spec Run cycles", () => {
	it("skips a two-cycle while keeping the rest of the Run in dependency order", () => {
		const plan = evaluateEligibility(
			state([spec(), blocked(3, key(4)), child(4), blocked(5, key(6)), blocked(6, key(5))]),
			ALLOWLIST,
			NOW_MS,
		)

		expect(plan.runs).toEqual([
			{
				kind: "spec-run",
				spec: SPEC,
				tickets: [key(4), key(3)],
				host: "homeserver2",
			},
		])
		expect(plan.skipped).toEqual([
			{ issue: key(5), reason: { code: "open-blocker", blockers: [key(6)] } },
			{ issue: key(6), reason: { code: "open-blocker", blockers: [key(5)] } },
		])
	})

	it("skips every member of a longer cycle", () => {
		const plan = evaluateEligibility(
			state([spec(), child(3), blocked(5, key(6)), blocked(6, key(7)), blocked(7, key(5))]),
			ALLOWLIST,
			NOW_MS,
		)

		expect(plan.runs).toEqual([
			{ kind: "spec-run", spec: SPEC, tickets: [key(3)], host: "homeserver2" },
		])
		expect(plan.skipped).toEqual([
			{ issue: key(5), reason: { code: "open-blocker", blockers: [key(6)] } },
			{ issue: key(6), reason: { code: "open-blocker", blockers: [key(7)] } },
			{ issue: key(7), reason: { code: "open-blocker", blockers: [key(5)] } },
		])
	})

	it("skips a child blocked by itself", () => {
		const plan = evaluateEligibility(
			state([spec(), child(3), blocked(5, key(5))]),
			ALLOWLIST,
			NOW_MS,
		)

		expect(plan.runs).toEqual([
			{ kind: "spec-run", spec: SPEC, tickets: [key(3)], host: "homeserver2" },
		])
		expect(plan.skipped).toEqual([
			{ issue: key(5), reason: { code: "open-blocker", blockers: [key(5)] } },
		])
	})

	it("skips a child downstream of a cycle", () => {
		const plan = evaluateEligibility(
			state([spec(), child(3), blocked(1, key(5)), blocked(5, key(6)), blocked(6, key(5))]),
			ALLOWLIST,
			NOW_MS,
		)

		expect(plan.runs).toEqual([
			{ kind: "spec-run", spec: SPEC, tickets: [key(3)], host: "homeserver2" },
		])
		expect(plan.skipped).toEqual([
			{ issue: key(1), reason: { code: "open-blocker", blockers: [key(5)] } },
			{ issue: key(5), reason: { code: "open-blocker", blockers: [key(6)] } },
			{ issue: key(6), reason: { code: "open-blocker", blockers: [key(5)] } },
		])
	})

	it("skips the Spec when every child is in a cycle", () => {
		const plan = evaluateEligibility(
			state([spec(), blocked(3, key(4)), blocked(4, key(3))]),
			ALLOWLIST,
			NOW_MS,
		)

		expect(plan.runs).toEqual([])
		expect(plan.skipped).toEqual([
			{ issue: SPEC, reason: { code: "no-eligible-children" } },
			{ issue: key(3), reason: { code: "open-blocker", blockers: [key(4)] } },
			{ issue: key(4), reason: { code: "open-blocker", blockers: [key(3)] } },
		])
	})

	it("lists a blocker once when the same edge is read twice", () => {
		const twice = child(5, {
			blockers: [
				{ key: key(6), status: "open" },
				{ key: key(6), status: "open" },
			],
		})

		const plan = evaluateEligibility(
			state([spec(), child(3), twice, blocked(6, key(5))]),
			ALLOWLIST,
			NOW_MS,
		)

		expect(plan.skipped).toContainEqual({
			issue: key(5),
			reason: { code: "open-blocker", blockers: [key(6)] },
		})
	})
})

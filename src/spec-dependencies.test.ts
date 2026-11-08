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

function state(issues: IssueState[], liveThreads: IssueKey[] = []): RepositoryState {
	return { issues, liveThreads }
}

describe("Spec Run dependencies", () => {
	it("skips a child whose sibling blocker is skipped as human-only", () => {
		const plan = evaluateEligibility(
			state([spec(), child(3), blocked(4, key(5)), child(5, { labels: ["ready-for-human"] })]),
			ALLOWLIST,
			NOW_MS,
		)

		expect(plan.runs).toEqual([
			{ kind: "spec-run", spec: SPEC, tickets: [key(3)], host: "homeserver2" },
		])
		expect(plan.skipped).toEqual([
			{ issue: key(4), reason: { code: "open-blocker", blockers: [key(5)] } },
			{ issue: key(5), reason: { code: "needs-human" } },
		])
	})

	it("skips a child whose sibling blocker holds a live Claim", () => {
		const plan = evaluateEligibility(
			state([
				spec(),
				child(3),
				blocked(4, key(5)),
				child(5, { claim: { claimedAtMs: NOW_MS - 60 * 60 * 1000 } }),
			]),
			ALLOWLIST,
			NOW_MS,
		)

		expect(plan.runs).toEqual([
			{ kind: "spec-run", spec: SPEC, tickets: [key(3)], host: "homeserver2" },
		])
		expect(plan.skipped).toEqual([
			{ issue: key(4), reason: { code: "open-blocker", blockers: [key(5)] } },
			{ issue: key(5), reason: { code: "live-claim" } },
		])
	})

	it("skips a child whose sibling blocker holds a live thread", () => {
		const plan = evaluateEligibility(
			state([spec(), child(3), blocked(4, key(5)), child(5)], [key(5)]),
			ALLOWLIST,
			NOW_MS,
		)

		expect(plan.runs).toEqual([
			{ kind: "spec-run", spec: SPEC, tickets: [key(3)], host: "homeserver2" },
		])
		expect(plan.skipped).toEqual([
			{ issue: key(4), reason: { code: "open-blocker", blockers: [key(5)] } },
			{ issue: key(5), reason: { code: "live-thread" } },
		])
	})

	it("skips a child whose sibling blocker has an external open blocker", () => {
		const outside = key(9)
		const plan = evaluateEligibility(
			state([spec(), child(3), blocked(4, key(5)), blocked(5, outside)]),
			ALLOWLIST,
			NOW_MS,
		)

		expect(plan.runs).toEqual([
			{ kind: "spec-run", spec: SPEC, tickets: [key(3)], host: "homeserver2" },
		])
		expect(plan.skipped).toEqual([
			{ issue: key(4), reason: { code: "open-blocker", blockers: [key(5)] } },
			{ issue: key(5), reason: { code: "open-blocker", blockers: [outside] } },
		])
	})

	it("propagates a skipped sibling through a chain of blockers", () => {
		const plan = evaluateEligibility(
			state([
				spec(),
				child(3),
				blocked(4, key(5)),
				blocked(5, key(6)),
				child(6, { labels: ["ready-for-human"] }),
			]),
			ALLOWLIST,
			NOW_MS,
		)

		expect(plan.runs).toEqual([
			{ kind: "spec-run", spec: SPEC, tickets: [key(3)], host: "homeserver2" },
		])
		expect(plan.skipped).toEqual([
			{ issue: key(4), reason: { code: "open-blocker", blockers: [key(5)] } },
			{ issue: key(5), reason: { code: "open-blocker", blockers: [key(6)] } },
			{ issue: key(6), reason: { code: "needs-human" } },
		])
	})

	it("orders Tickets after their sibling blockers, even when the blocker has a higher number", () => {
		const plan = evaluateEligibility(
			state([spec(), blocked(3, key(5)), child(5), blocked(4, key(3))]),
			ALLOWLIST,
			NOW_MS,
		)

		expect(plan.runs).toEqual([
			{
				kind: "spec-run",
				spec: SPEC,
				tickets: [key(5), key(3), key(4)],
				host: "homeserver2",
			},
		])
		expect(plan.skipped).toEqual([])
	})
})

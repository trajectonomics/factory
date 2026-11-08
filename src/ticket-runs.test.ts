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
const TICKET = key(4)

function key(number: number, repository = CLI): IssueKey {
	return { repository, number }
}

function issue(issueKey: IssueKey, overrides: Partial<IssueState> = {}): IssueState {
	return { key: issueKey, kind: "ticket", status: "open", labels: [], blockers: [], ...overrides }
}

function childOfSpec(overrides: Partial<IssueState> = {}): IssueState {
	return issue(TICKET, { parentSpec: SPEC, labels: ["ready-for-agent"], ...overrides })
}

function state(issues: IssueState[]): RepositoryState {
	return { issues, liveThreads: [] }
}

describe("Ticket Runs", () => {
	it("yields a Ticket Run for an approved Ticket whose parent Spec is not approved", () => {
		const plan = evaluateEligibility(
			state([issue(SPEC, { kind: "spec" }), childOfSpec()]),
			ALLOWLIST,
			NOW_MS,
		)

		expect(plan.runs).toEqual([{ kind: "ticket-run", ticket: TICKET, host: "homeserver2" }])
		expect(plan.skipped).toEqual([{ issue: SPEC, reason: { code: "not-approved" } }])
	})

	it("leaves an approved Ticket waiting when its approved parent Spec is not eligible", () => {
		const blocker = key(9, "trajectonomics/sim-core")
		const spec = issue(SPEC, {
			kind: "spec",
			labels: ["ready-for-agent"],
			blockers: [{ key: blocker, status: "open" }],
		})

		const plan = evaluateEligibility(state([spec, childOfSpec()]), ALLOWLIST, NOW_MS)

		expect(plan.runs).toEqual([])
		expect(plan.skipped).toEqual([
			{ issue: SPEC, reason: { code: "open-blocker", blockers: [blocker] } },
			{ issue: TICKET, reason: { code: "parent-spec-not-eligible", spec: SPEC } },
		])
	})

	it("yields a Ticket Run for an approved Ticket whose parent Spec is closed", () => {
		const spec = issue(SPEC, { kind: "spec", status: "closed", labels: ["ready-for-agent"] })

		const plan = evaluateEligibility(state([spec, childOfSpec()]), ALLOWLIST, NOW_MS)

		expect(plan.runs).toEqual([{ kind: "ticket-run", ticket: TICKET, host: "homeserver2" }])
		expect(plan.skipped).toEqual([{ issue: SPEC, reason: { code: "closed" } }])
	})
})

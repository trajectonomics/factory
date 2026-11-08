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

function key(number: number): IssueKey {
	return { repository: CLI, number }
}

function issue(issueKey: IssueKey, overrides: Partial<IssueState> = {}): IssueState {
	return { key: issueKey, kind: "ticket", status: "open", labels: [], blockers: [], ...overrides }
}

function state(issues: IssueState[]): RepositoryState {
	return { issues, liveThreads: [] }
}

describe("triage labels", () => {
	it("never makes a Ticket labelled ready-for-human Eligible", () => {
		const ticket = issue(key(4), { labels: ["ready-for-agent", "ready-for-human"] })

		const plan = evaluateEligibility(state([ticket]), ALLOWLIST, NOW_MS)

		expect(plan.runs).toEqual([])
		expect(plan.skipped).toEqual([{ issue: key(4), reason: { code: "needs-human" } }])
	})

	it("skips a Ticket labelled needs-info even when approved", () => {
		const ticket = issue(key(4), { labels: ["ready-for-agent", "needs-info"] })

		const plan = evaluateEligibility(state([ticket]), ALLOWLIST, NOW_MS)

		expect(plan.runs).toEqual([])
		expect(plan.skipped).toEqual([{ issue: key(4), reason: { code: "needs-info" } }])
	})

	it("skips a Ticket labelled wontfix even when approved", () => {
		const ticket = issue(key(4), { labels: ["ready-for-agent", "wontfix"] })

		const plan = evaluateEligibility(state([ticket]), ALLOWLIST, NOW_MS)

		expect(plan.runs).toEqual([])
		expect(plan.skipped).toEqual([{ issue: key(4), reason: { code: "wontfix" } }])
	})

	it("treats the agent-working label as a live Claim without a Claim timestamp", () => {
		const ticket = issue(key(4), { labels: ["ready-for-agent", "agent-working"] })

		const plan = evaluateEligibility(state([ticket]), ALLOWLIST, NOW_MS)

		expect(plan.runs).toEqual([])
		expect(plan.skipped).toEqual([{ issue: key(4), reason: { code: "live-claim" } }])
	})
})

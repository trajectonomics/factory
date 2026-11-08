import { describe, expect, it } from "bun:test"
import {
	type Allowlist,
	EligibilityError,
	evaluateEligibility,
	type IssueKey,
	type IssueState,
	type RepositoryState,
} from "./index"

const NOW_MS = 1_000_000_000
const CLI = "trajectonomics/cli"
const SIM = "trajectonomics/sim-core"
const ALLOWLIST: Allowlist = [
	{ repository: CLI, host: "homeserver2" },
	{ repository: SIM, host: "homeserver1" },
]
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

function eligibilityError(run: () => void): EligibilityError | undefined {
	try {
		run()
	} catch (error) {
		return error instanceof EligibilityError ? error : undefined
	}
	return undefined
}

describe("allowlist and hosts", () => {
	it("skips a Ticket in a repository outside the allowlist", () => {
		const ticket = issue(key(4, "trajectonomics/ledger-core"), {
			labels: ["ready-for-agent"],
		})

		const plan = evaluateEligibility(state([ticket]), ALLOWLIST, NOW_MS)

		expect(plan.runs).toEqual([])
		expect(plan.skipped).toEqual([
			{
				issue: key(4, "trajectonomics/ledger-core"),
				reason: { code: "repository-not-allowlisted" },
			},
		])
	})

	it("skips a Spec in a repository outside the allowlist", () => {
		const ledgerSpec = issue(key(2, "trajectonomics/ledger-core"), {
			kind: "spec",
			labels: ["ready-for-agent"],
		})

		const plan = evaluateEligibility(state([ledgerSpec]), ALLOWLIST, NOW_MS)

		expect(plan.runs).toEqual([])
		expect(plan.skipped).toEqual([
			{
				issue: key(2, "trajectonomics/ledger-core"),
				reason: { code: "repository-not-allowlisted" },
			},
		])
	})

	it("rejects an allowlist that maps one repository to more than one host", () => {
		const duplicate: Allowlist = [
			{ repository: CLI, host: "homeserver2" },
			{ repository: CLI, host: "homeserver1" },
		]

		const error = eligibilityError(() => evaluateEligibility(state([]), duplicate, NOW_MS))

		expect(error?.code).toBe("duplicate-allowlist-entry")
		expect(error?.field).toBe("allowlist[trajectonomics/cli]")
	})

	it("keeps a Spec Run on the Spec's host and skips a child on another host", () => {
		const plan = evaluateEligibility(
			state([spec(), child(3), issue(key(4, SIM), { parentSpec: SPEC })]),
			ALLOWLIST,
			NOW_MS,
		)

		expect(plan.runs).toEqual([
			{ kind: "spec-run", spec: SPEC, tickets: [key(3)], host: "homeserver2" },
		])
		expect(plan.skipped).toEqual([
			{ issue: key(4, SIM), reason: { code: "different-host", host: "homeserver1" } },
		])
	})
})

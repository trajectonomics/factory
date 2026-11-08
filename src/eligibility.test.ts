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
const ALLOWLIST: Allowlist = [{ repository: CLI, host: "homeserver2" }]

function key(number: number, repository = CLI): IssueKey {
	return { repository, number }
}

function issue(issueKey: IssueKey, overrides: Partial<IssueState> = {}): IssueState {
	return { key: issueKey, kind: "ticket", status: "open", labels: [], blockers: [], ...overrides }
}

function state(issues: IssueState[], liveThreads: IssueKey[] = []): RepositoryState {
	return { issues, liveThreads }
}

function eligibilityError(run: () => void): EligibilityError | undefined {
	try {
		run()
	} catch (error) {
		return error instanceof EligibilityError ? error : undefined
	}
	return undefined
}

describe("evaluateEligibility", () => {
	it("yields a Ticket Run for an approved standalone Ticket", () => {
		const ticket = issue(key(4), { labels: ["ready-for-agent"] })

		const plan = evaluateEligibility(state([ticket]), ALLOWLIST, NOW_MS)

		expect(plan).toEqual({
			runs: [{ kind: "ticket-run", ticket: key(4), host: "homeserver2" }],
			skipped: [],
		})
	})

	it("skips a Ticket that has no Approval", () => {
		const ticket = issue(key(4))

		const plan = evaluateEligibility(state([ticket]), ALLOWLIST, NOW_MS)

		expect(plan.runs).toEqual([])
		expect(plan.skipped).toEqual([{ issue: key(4), reason: { code: "not-approved" } }])
	})

	it("skips a closed Ticket", () => {
		const ticket = issue(key(4), { status: "closed", labels: ["ready-for-agent"] })

		const plan = evaluateEligibility(state([ticket]), ALLOWLIST, NOW_MS)

		expect(plan.skipped).toEqual([{ issue: key(4), reason: { code: "closed" } }])
	})

	it("skips a Ticket with an open blocker in the same repository", () => {
		const ticket = issue(key(4), {
			labels: ["ready-for-agent"],
			blockers: [{ key: key(3), status: "open" }],
		})

		const plan = evaluateEligibility(state([ticket]), ALLOWLIST, NOW_MS)

		expect(plan.skipped).toEqual([
			{ issue: key(4), reason: { code: "open-blocker", blockers: [key(3)] } },
		])
	})

	it("skips a Ticket with an open blocker in another repository", () => {
		const ticket = issue(key(4), {
			labels: ["ready-for-agent"],
			blockers: [{ key: key(9, "trajectonomics/sim-core"), status: "open" }],
		})

		const plan = evaluateEligibility(state([ticket]), ALLOWLIST, NOW_MS)

		expect(plan.skipped).toEqual([
			{
				issue: key(4),
				reason: { code: "open-blocker", blockers: [key(9, "trajectonomics/sim-core")] },
			},
		])
	})

	it("does not skip a Ticket whose blocker is closed", () => {
		const ticket = issue(key(4), {
			labels: ["ready-for-agent"],
			blockers: [{ key: key(3), status: "closed" }],
		})

		const plan = evaluateEligibility(state([ticket]), ALLOWLIST, NOW_MS)

		expect(plan.runs).toEqual([{ kind: "ticket-run", ticket: key(4), host: "homeserver2" }])
		expect(plan.skipped).toEqual([])
	})

	it("names every open blocker in key order", () => {
		const elsewhere = key(9, "trajectonomics/sim-core")
		const ticket = issue(key(4), {
			labels: ["ready-for-agent"],
			blockers: [
				{ key: elsewhere, status: "open" },
				{ key: key(3), status: "open" },
			],
		})

		const plan = evaluateEligibility(state([ticket]), ALLOWLIST, NOW_MS)

		expect(plan.skipped).toEqual([
			{ issue: key(4), reason: { code: "open-blocker", blockers: [key(3), elsewhere] } },
		])
	})

	it("skips a Ticket with a live Claim inside its Lease", () => {
		const ticket = issue(key(4), {
			labels: ["ready-for-agent"],
			claim: { claimedAtMs: NOW_MS - (2 * 60 * 60 * 1000 - 1) },
		})

		const plan = evaluateEligibility(state([ticket]), ALLOWLIST, NOW_MS)

		expect(plan.skipped).toEqual([{ issue: key(4), reason: { code: "live-claim" } }])
	})

	it("returns a Ticket to Eligible when its Claim Lease has expired", () => {
		const ticket = issue(key(4), {
			labels: ["ready-for-agent"],
			claim: { claimedAtMs: NOW_MS - 2 * 60 * 60 * 1000 },
		})

		const plan = evaluateEligibility(state([ticket]), ALLOWLIST, NOW_MS)

		expect(plan.runs).toEqual([{ kind: "ticket-run", ticket: key(4), host: "homeserver2" }])
	})

	it("skips a Ticket with a live thread but no Claim", () => {
		const ticket = issue(key(4), { labels: ["ready-for-agent"] })

		const plan = evaluateEligibility(state([ticket], [key(4)]), ALLOWLIST, NOW_MS)

		expect(plan.skipped).toEqual([{ issue: key(4), reason: { code: "live-thread" } }])
	})

	it("skips a Ticket with a live thread behind a stale Claim", () => {
		const ticket = issue(key(4), {
			labels: ["ready-for-agent"],
			claim: { claimedAtMs: NOW_MS - 3 * 60 * 60 * 1000 },
		})

		const plan = evaluateEligibility(state([ticket], [key(4)]), ALLOWLIST, NOW_MS)

		expect(plan.skipped).toEqual([{ issue: key(4), reason: { code: "live-claim" } }])
	})

	it("rejects a repository state that lists one issue twice", () => {
		const first = issue(key(4), { labels: ["ready-for-agent"] })
		const second = issue(key(4), { labels: ["ready-for-agent"] })

		const error = eligibilityError(() =>
			evaluateEligibility(state([first, second]), ALLOWLIST, NOW_MS),
		)

		expect(error?.code).toBe("duplicate-issue-key")
		expect(error?.field).toBe("issues[trajectonomics/cli#4]")
	})
})

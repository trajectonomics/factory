import { describe, expect, it } from "bun:test"
import { planDispatch } from "./dispatch-plan"
import { formatDispatchReport, passReport } from "./dispatch-report"
import { approved, config, FACTORY, key, NOW_MS, reading, state } from "./fixtures/dispatch"

function passReportText() {
	const input = reading({
		state: state([
			approved(4, {
				labels: ["ready-for-agent", "agent-working"],
				claim: { claimedAtMs: NOW_MS - 3 * 60 * 60 * 1000 },
			}),
		]),
		ledger: {
			pullRequests: [
				{
					issue: key(4),
					number: 12,
					head: "factory/4-ticket-4",
					draft: false,
					openedAtMs: NOW_MS - 1_000,
				},
			],
			exits: [
				{ issue: key(5, FACTORY), kind: "gate-failure", atMs: NOW_MS - 2_000 },
				{ issue: key(6, FACTORY), kind: "urgent", atMs: NOW_MS - 3_000 },
			],
		},
	})
	const plan = planDispatch(input, config())
	const report = passReport(plan, input)
	return { report, text: formatDispatchReport(report) }
}

describe("a pass report", () => {
	it("lists Runs, PRs, Gate failures, Exits, stale Claims and host load", () => {
		const { report, text } = passReportText()

		expect(text).toContain("Runs: 1")
		expect(text).toContain("trajectonomics/cli#4 ticket-run on homeserver2")
		expect(text).toContain("PRs: 1")
		expect(text).toContain("Gate failures: 1")
		expect(text).toContain("spec gap 0")
		expect(text).toContain("urgent 1")
		expect(text).toContain("Stale Claims: 1")
		expect(text).toContain("Host load: homeserver2")
		expect(report.exits["gate-failure"]).toBe(1)
	})

	it("lists a pull request whose head names no issue by number and head", () => {
		const input = reading({
			state: state([]),
			ledger: {
				pullRequests: [
					{
						issue: undefined,
						number: 13,
						head: "docs/agent-rules-20261113",
						draft: false,
						openedAtMs: NOW_MS - 1_000,
					},
				],
				exits: [],
			},
		})
		const plan = planDispatch(input, config())
		const text = formatDispatchReport(passReport(plan, input))
		expect(text).toContain("PRs: 1")
		expect(text).toContain("#13 (docs/agent-rules-20261113) ready")
	})
})

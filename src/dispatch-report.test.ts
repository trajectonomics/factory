import { describe, expect, it } from "bun:test"
import { planDispatch } from "./dispatch-plan"
import type { DispatchReport } from "./dispatch-plan-contracts"
import {
	formatDispatchReport,
	passReport,
	THREE_DAY_REPORT_MS,
	threeDayReport,
} from "./dispatch-report"
import { approved, config, FACTORY, key, NOW_MS, reading, state } from "./fixtures/dispatch"

const DAY_MS = 24 * 60 * 60 * 1000
function reportAt(atMs: number, overrides: Partial<DispatchReport> = {}): DispatchReport {
	return {
		atMs,
		runs: [],
		pullRequests: [],
		gateFailures: [],
		exits: { "spec-gap": 0, "follow-up": 0, urgent: 0, "gate-failure": 0 },
		staleClaims: [],
		hostLoad: [],
		...overrides,
	}
}
function load(loadAverage: number) {
	return { host: "homeserver2", loadAverage, memoryUsedFraction: 0.2, diskUsedFraction: 0.3 }
}
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
})

describe("the 3-day report", () => {
	it("uses a three-day window and keeps only what is inside it", () => {
		const history = [
			reportAt(NOW_MS - 4 * DAY_MS, {
				runs: [
					{
						issue: key(1),
						kind: "ticket-run",
						host: "homeserver2",
						launchedAtMs: NOW_MS - 4 * DAY_MS,
					},
				],
				staleClaims: [key(1)],
			}),
			reportAt(NOW_MS - DAY_MS, {
				runs: [
					{
						issue: key(4),
						kind: "ticket-run",
						host: "homeserver1",
						launchedAtMs: NOW_MS - DAY_MS,
					},
				],
				staleClaims: [key(4)],
			}),
		]

		const report = threeDayReport(
			history,
			{
				pullRequests: [],
				exits: [
					{ issue: key(4), kind: "spec-gap", atMs: NOW_MS - 4 * DAY_MS },
					{ issue: key(6), kind: "follow-up", atMs: NOW_MS - DAY_MS },
				],
			},
			NOW_MS,
		)

		expect(THREE_DAY_REPORT_MS).toBe(3 * DAY_MS)
		expect(report.runs.map((run) => run.issue)).toEqual([key(4)])
		expect(report.staleClaims).toEqual([key(4)])
		expect(report.exits["spec-gap"]).toBe(0)
		expect(report.exits["follow-up"]).toBe(1)
	})

	it("reports the latest host load in the window", () => {
		const history = [
			reportAt(NOW_MS - 2 * DAY_MS, { hostLoad: [load(1)] }),
			reportAt(NOW_MS - DAY_MS, { hostLoad: [load(3)] }),
		]

		const report = threeDayReport(history, { pullRequests: [], exits: [] }, NOW_MS)

		expect(report.hostLoad[0]?.loadAverage).toBe(3)
	})
})

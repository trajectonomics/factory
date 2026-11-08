import { describe, expect, it } from "bun:test"
import {
	evaluateKillSwitch,
	type IssueState,
	type KillSwitch,
	PAUSE_LABEL,
	pausedRepositories,
} from "./index"

const CLI = "trajectonomics/cli"
const SIM = "trajectonomics/sim-core"

function issue(repository: string, labels: string[] = []): IssueState {
	return { key: { repository, number: 1 }, kind: "spec", status: "open", labels, blockers: [] }
}

function killSwitch(overrides: Partial<KillSwitch> = {}): KillSwitch {
	return { scheduleEnabled: true, pausedRepositories: [], ...overrides }
}

describe("the kill switch", () => {
	it("names the label that pauses a repository", () => {
		expect(PAUSE_LABEL).toBe("factory:pause")
	})

	it("stops every launch when the schedule is disabled, even for a paused repository", () => {
		const stopped = killSwitch({ scheduleEnabled: false, pausedRepositories: [CLI] })

		expect(evaluateKillSwitch(stopped, CLI)).toEqual({
			allowed: false,
			reason: { code: "schedule-disabled" },
		})
	})

	it("stops launches for a repository paused by the factory:pause label", () => {
		const paused = pausedRepositories([issue(SIM), issue(CLI, [PAUSE_LABEL])])

		expect(evaluateKillSwitch(killSwitch({ pausedRepositories: paused }), CLI)).toEqual({
			allowed: false,
			reason: { code: "repository-paused", repository: CLI },
		})
	})

	it("leaves another repository launching while one is paused", () => {
		const paused = pausedRepositories([issue(SIM, [PAUSE_LABEL])])

		expect(evaluateKillSwitch(killSwitch({ pausedRepositories: paused }), CLI)).toEqual({
			allowed: true,
		})
	})

	it("collects each paused repository once, in repository order", () => {
		const issues = [
			issue(SIM, [PAUSE_LABEL]),
			issue(CLI, [PAUSE_LABEL]),
			issue(CLI, [PAUSE_LABEL]),
			issue(SIM),
		]

		expect(pausedRepositories(issues)).toEqual([CLI, SIM])
		expect(Object.isFrozen(pausedRepositories(issues))).toBe(true)
	})
})

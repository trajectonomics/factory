import { describe, expect, it } from "bun:test"
import { evaluatePacingGuard, type LaunchPacing } from "./index"

const MINUTE_MS = 60_000
const LAST_LAUNCH_MS = 1_000_000

function pacing(overrides: Partial<LaunchPacing> = {}): LaunchPacing {
	return {
		lastLaunchAtMs: LAST_LAUNCH_MS,
		nowMs: LAST_LAUNCH_MS + MINUTE_MS,
		minIntervalMs: MINUTE_MS,
		...overrides,
	}
}

describe("the launch pacing Guard", () => {
	it("allows the first launch on a host", () => {
		const firstLaunch: LaunchPacing = { nowMs: LAST_LAUNCH_MS, minIntervalMs: MINUTE_MS }

		expect(evaluatePacingGuard(firstLaunch)).toEqual({ allowed: true })
	})

	it("allows a launch once the pacing interval has passed", () => {
		expect(evaluatePacingGuard(pacing())).toEqual({ allowed: true })
	})

	it("stops a launch that arrives before the pacing interval has passed", () => {
		const decision = evaluatePacingGuard(pacing({ nowMs: LAST_LAUNCH_MS + 40_000 }))

		expect(decision).toEqual({
			allowed: false,
			reason: { code: "launch-too-soon", waitMs: 20_000 },
		})
	})
})

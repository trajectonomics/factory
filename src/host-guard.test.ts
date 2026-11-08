import { describe, expect, it } from "bun:test"
import { evaluateHostGuard, type HostHealth, type HostThresholds } from "./index"

const THRESHOLDS: HostThresholds = {
	loadAverage: 4,
	memoryUsedFraction: 0.9,
	diskUsedFraction: 0.9,
}

function health(overrides: Partial<HostHealth> = {}): HostHealth {
	return { loadAverage: 1.5, memoryUsedFraction: 0.5, diskUsedFraction: 0.6, ...overrides }
}

describe("the host Guard", () => {
	it("allows launching while load, memory and disk are below their thresholds", () => {
		expect(evaluateHostGuard(health(), THRESHOLDS)).toEqual({ allowed: true })
	})

	it("allows launching while every measurement is exactly at its threshold", () => {
		const loaded = health({ loadAverage: 4, memoryUsedFraction: 0.9, diskUsedFraction: 0.9 })

		expect(evaluateHostGuard(loaded, THRESHOLDS)).toEqual({ allowed: true })
	})

	it("stops launching when host load crosses its threshold", () => {
		const decision = evaluateHostGuard(health({ loadAverage: 4.5 }), THRESHOLDS)

		expect(decision).toEqual({
			allowed: false,
			reason: {
				code: "host-pressure",
				pressures: [{ code: "load", loadAverage: 4.5, threshold: 4 }],
			},
		})
	})

	it("stops launching when host memory crosses its threshold", () => {
		const decision = evaluateHostGuard(health({ memoryUsedFraction: 0.95 }), THRESHOLDS)

		expect(decision).toEqual({
			allowed: false,
			reason: {
				code: "host-pressure",
				pressures: [{ code: "memory", usedFraction: 0.95, threshold: 0.9 }],
			},
		})
	})

	it("stops launching when host disk crosses its threshold", () => {
		const decision = evaluateHostGuard(health({ diskUsedFraction: 0.99 }), THRESHOLDS)

		expect(decision).toEqual({
			allowed: false,
			reason: {
				code: "host-pressure",
				pressures: [{ code: "disk", usedFraction: 0.99, threshold: 0.9 }],
			},
		})
	})

	it("names every host measurement that crossed its threshold", () => {
		const decision = evaluateHostGuard(
			health({ loadAverage: 5, diskUsedFraction: 0.99 }),
			THRESHOLDS,
		)

		expect(decision).toEqual({
			allowed: false,
			reason: {
				code: "host-pressure",
				pressures: [
					{ code: "load", loadAverage: 5, threshold: 4 },
					{ code: "disk", usedFraction: 0.99, threshold: 0.9 },
				],
			},
		})
	})

	it("returns a frozen decision with frozen pressures", () => {
		const decision = evaluateHostGuard(health({ diskUsedFraction: 0.99 }), THRESHOLDS)
		if (decision.allowed) throw new Error("expected the host Guard to stop")
		if (decision.reason.code !== "host-pressure") throw new Error("expected host pressure")

		expect(Object.isFrozen(decision)).toBe(true)
		expect(Object.isFrozen(decision.reason)).toBe(true)
		expect(Object.isFrozen(decision.reason.pressures)).toBe(true)
		expect(Object.isFrozen(decision.reason.pressures[0])).toBe(true)
	})
})

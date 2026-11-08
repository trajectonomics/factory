import { describe, expect, it } from "bun:test"
import { evaluateGate, GateError, type GateRound } from "./gate"

function round(overrides: Partial<GateRound> = {}): GateRound {
	return {
		checkPassed: true,
		conformance: { findings: [] },
		standards: { findings: [] },
		...overrides,
	}
}

function errorOf(run: () => unknown): GateError | undefined {
	try {
		run()
	} catch (error) {
		return error instanceof GateError ? error : undefined
	}
	return undefined
}

describe("the Gate", () => {
	it("asks for a round before any Gate round has run", () => {
		expect(evaluateGate([])).toEqual({ kind: "rerun" })
	})

	it("opens the Gate when the first round is clean", () => {
		expect(evaluateGate([round()])).toEqual({ kind: "ready" })
	})

	it("asks for another round when the first round fails bun run check", () => {
		expect(evaluateGate([round({ checkPassed: false })])).toEqual({ kind: "rerun" })
	})

	it("opens the Gate when the second round is clean", () => {
		const rounds = [round({ conformance: { findings: ["The error path is untested."] } }), round()]

		expect(evaluateGate(rounds)).toEqual({ kind: "ready" })
	})

	it("reports the check failure once both rounds are spent", () => {
		const decision = evaluateGate([round({ checkPassed: false }), round({ checkPassed: false })])

		expect(decision).toEqual({ kind: "gate-failure", findings: ["bun run check failed"] })
	})

	it("reports every Conformance and Standards finding from the final round", () => {
		const decision = evaluateGate([
			round({ conformance: { findings: ["An earlier finding."] } }),
			round({
				conformance: { findings: ["The Claim is never released."] },
				standards: { findings: ["The error field names an internal variable."] },
			}),
		])

		expect(decision).toEqual({
			kind: "gate-failure",
			findings: [
				"Conformance Review: The Claim is never released.",
				"Standards Review: The error field names an internal variable.",
			],
		})
	})

	it("rejects a third Gate round", () => {
		const error = errorOf(() => evaluateGate([round(), round(), round()]))

		expect(error?.code).toBe("too-many-rounds")
		expect(error?.field).toBe("rounds")
	})

	it("returns a frozen decision", () => {
		expect(Object.isFrozen(evaluateGate([round()]))).toBe(true)
	})
})

import { deepFreeze } from "./freeze"

/** The findings of one Conformance or Standards Review. */
export type GateReview = {
	readonly findings: readonly string[]
}

/** One Gate round: `bun run check` and both reviews. */
export type GateRound = {
	readonly checkPassed: boolean
	readonly conformance: GateReview
	readonly standards: GateReview
}

/** What the Gate says after the latest round. */
export type GateDecision =
	| { readonly kind: "ready" }
	| { readonly kind: "rerun" }
	| { readonly kind: "gate-failure"; readonly findings: readonly string[] }

/** The inputs a Gate decision can reject. */
export type GateErrorCode = "too-many-rounds"

/** A Gate history that the Gate cannot decide. */
export class GateError extends Error {
	readonly code: GateErrorCode
	readonly field: string

	constructor(code: GateErrorCode, field: string, message: string) {
		super(message)
		this.name = "GateError"
		this.code = code
		this.field = field
	}
}

/** The most rounds a Ticket Run may spend at the Gate. */
export const MAX_GATE_ROUNDS = 2

const CHECK_FAILURE = "bun run check failed"

/** Decides whether the Gate is ready, must run another round, or has failed. */
export function evaluateGate(rounds: readonly GateRound[]): GateDecision {
	if (rounds.length > MAX_GATE_ROUNDS) {
		throw new GateError(
			"too-many-rounds",
			"rounds",
			`A Gate takes at most ${MAX_GATE_ROUNDS} rounds, received ${rounds.length}`,
		)
	}
	const latest = rounds.at(-1)
	if (latest === undefined) return deepFreeze({ kind: "rerun" })
	if (isClean(latest)) return deepFreeze({ kind: "ready" })
	if (rounds.length < MAX_GATE_ROUNDS) return deepFreeze({ kind: "rerun" })
	return deepFreeze({ kind: "gate-failure", findings: findingsOf(latest) })
}

function isClean(round: GateRound): boolean {
	return (
		round.checkPassed &&
		round.conformance.findings.length === 0 &&
		round.standards.findings.length === 0
	)
}

function findingsOf(round: GateRound): string[] {
	const findings: string[] = []
	if (!round.checkPassed) findings.push(CHECK_FAILURE)
	for (const finding of round.conformance.findings) {
		findings.push(`Conformance Review: ${finding}`)
	}
	for (const finding of round.standards.findings) {
		findings.push(`Standards Review: ${finding}`)
	}
	return findings
}

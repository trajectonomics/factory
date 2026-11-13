import type { GateReviewEvidence } from "../gate"

/** Two clean independent reviews for a Gate report fixture. */
export const GATE_REVIEWS: readonly GateReviewEvidence[] = [
	{
		role: "Conformance Review",
		provider: "claudeAgent",
		model: "claude-sonnet-5-5",
		thread: "t3-thread://conformance-1",
		verdict: "no findings",
		findingsFixed: 2,
	},
	{
		role: "Standards Review",
		provider: "antigravity",
		model: "gemini-4-hydrogen",
		thread: "t3-thread://standards-1",
		verdict: "no findings",
		findingsFixed: 1,
	},
]

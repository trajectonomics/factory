import { describe, expect, it } from "bun:test"
import { evaluateQueueGuard, type HumanQueue, queueDepth } from "./index"

function queue(overrides: Partial<HumanQueue> = {}): HumanQueue {
	return { openPullRequests: 0, needsSpecReview: 0, readyForHuman: 0, ...overrides }
}

describe("the queue Guard", () => {
	it("counts open Factory pull requests, Spec reviews and ready-for-human issues as queue depth", () => {
		const humanQueue = queue({ openPullRequests: 2, needsSpecReview: 3, readyForHuman: 4 })

		expect(queueDepth(humanQueue)).toBe(9)
	})

	it("allows launching while the human's queue is at its threshold", () => {
		const decision = evaluateQueueGuard(queue({ openPullRequests: 2, readyForHuman: 3 }), 5)

		expect(decision).toEqual({ allowed: true })
	})

	it("stops launching when the human's queue is deeper than its threshold", () => {
		const decision = evaluateQueueGuard(queue({ needsSpecReview: 3, readyForHuman: 3 }), 5)

		expect(decision).toEqual({
			allowed: false,
			reason: { code: "queue-too-deep", depth: 6, threshold: 5 },
		})
	})

	it("returns a frozen decision", () => {
		const decision = evaluateQueueGuard(queue({ readyForHuman: 1 }), 0)

		expect(Object.isFrozen(decision)).toBe(true)
		expect(decision.allowed).toBe(false)
	})
})

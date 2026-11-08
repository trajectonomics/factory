import { type GuardDecision, launchAllowed, launchStopped } from "./guard-contracts"

/** The open work waiting for the human: Factory pull requests and labelled issues. */
export type HumanQueue = {
	readonly openPullRequests: number
	readonly needsSpecReview: number
	readonly readyForHuman: number
}

/** How many items are waiting for the human. */
export function queueDepth(queue: HumanQueue): number {
	return queue.openPullRequests + queue.needsSpecReview + queue.readyForHuman
}

/** Stops launches while the human's queue is deeper than its threshold. */
export function evaluateQueueGuard(queue: HumanQueue, depthThreshold: number): GuardDecision {
	const depth = queueDepth(queue)
	if (depth <= depthThreshold) return launchAllowed()
	return launchStopped({ code: "queue-too-deep", depth, threshold: depthThreshold })
}

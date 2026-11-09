import type { RunExit } from "./dispatch-contracts"
import type { T3Thread } from "./t3"
import { issueFromThreadTitle } from "./t3-threads"

/** The urgent Exits among the threads: each Run thread waiting for the owner, dated by the pass that saw it. */
export function urgentExits(threads: readonly T3Thread[], nowMs: number): readonly RunExit[] {
	return threads.flatMap((thread) => {
		const issue = thread.status === "waiting" ? issueFromThreadTitle(thread.title) : undefined
		return issue === undefined ? [] : [{ issue, kind: "urgent" as const, atMs: nowMs }]
	})
}

import { describe, expect, it } from "bun:test"
import type { FactoryPullRequest } from "../dispatch-contracts"
import { key } from "../fixtures/dispatch"
import { gateFailureExits } from "./ledger-exits"

const NOW_MS = 1_800_000_000_000

function pullRequest(overrides: Partial<FactoryPullRequest>): FactoryPullRequest {
	return {
		issue: undefined,
		number: 12,
		head: "factory/4-ticket-4",
		draft: false,
		openedAtMs: NOW_MS - 1_000,
		...overrides,
	}
}

describe("gateFailureExits", () => {
	it("maps a draft pull request whose head names an issue to a gate-failure Exit", () => {
		const exits = gateFailureExits([pullRequest({ issue: key(4), draft: true })])
		expect(exits).toEqual([{ issue: key(4), kind: "gate-failure", atMs: NOW_MS - 1_000 }])
	})

	it("ignores a draft pull request whose head names no issue, and ready pull requests", () => {
		const exits = gateFailureExits([
			pullRequest({ head: "docs/agent-rules-20261113", draft: true }),
			pullRequest({ issue: key(4), draft: false }),
		])
		expect(exits).toEqual([])
	})
})

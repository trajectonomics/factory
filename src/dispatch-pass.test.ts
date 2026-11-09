import { describe, expect, it } from "bun:test"
import { CLAIM_LEASE_MS } from "./claim"
import type { DispatchReading } from "./dispatch-contracts"
import { runDispatchPass } from "./dispatch-pass"
import type { DispatchAdapters } from "./dispatch-pass-contracts"
import { approved, config, key, NOW_MS, reading, state } from "./fixtures/dispatch"
import type { FactoryWrite } from "./github/writes"
import type { T3LaunchRequest, T3Thread } from "./t3"

const THREAD: T3Thread = {
	id: "thread-cli-4",
	title: "traj/trajectonomics/cli#4",
	status: "queued",
	branch: "factory/4-ticket-4",
}

type Recorder = {
	readonly adapters: DispatchAdapters
	readonly writes: FactoryWrite[][]
	readonly launches: T3LaunchRequest[]
	readonly printed: string[]
}
function recorder(input: DispatchReading, failLaunch = false): Recorder {
	const writes: FactoryWrite[][] = []
	const launches: T3LaunchRequest[] = []
	const printed: string[] = []
	return {
		writes,
		launches,
		printed,
		adapters: {
			read: async () => input,
			applyWrites: async (batch) => {
				writes.push([...batch])
			},
			launch: async (request) => {
				launches.push(request)
				if (failLaunch) throw new Error("T3 is unreachable")
				return THREAD
			},
			print: (line) => {
				printed.push(line)
			},
		},
	}
}
function staleAndApproved(): DispatchReading {
	return reading({
		state: state([
			approved(4, {
				labels: ["ready-for-agent", "agent-working"],
				claim: { claimedAtMs: NOW_MS - CLAIM_LEASE_MS },
			}),
		]),
	})
}

describe("a Dispatcher pass", () => {
	it("prints every decision in a dry run and writes or launches nothing", async () => {
		const fake = recorder(staleAndApproved())

		await runDispatchPass(fake.adapters, config({ mode: "dry-run" }))

		expect(fake.writes).toEqual([])
		expect(fake.launches).toEqual([])
		expect(fake.printed).toContain(`remove label "agent-working" from ${key(4).repository}#4`)
		expect(fake.printed).toContain("claim trajectonomics/cli#4 at 1000000000")
		expect(fake.printed.some((line) => line.startsWith("launch trajectonomics/cli#4"))).toBe(true)
		expect(fake.printed.some((line) => line.startsWith("Runs"))).toBe(true)
	})

	it("applies reconciliation, then the Claim, then launches in live mode", async () => {
		const fake = recorder(staleAndApproved())

		const result = await runDispatchPass(fake.adapters, config({ mode: "live" }))

		expect(fake.writes).toEqual([
			[{ kind: "label", issue: key(4), label: "agent-working", present: false }],
			[{ kind: "claim", issue: key(4), claimedAtMs: NOW_MS }],
			[{ kind: "status", issue: key(4), status: "In progress" }],
		])
		expect(fake.launches).toHaveLength(1)
		expect(result.errors).toEqual([])
	})

	it("removes the Claim and reports the error when a launch fails", async () => {
		const fake = recorder(reading({ state: state([approved(4)]) }), true)

		const result = await runDispatchPass(fake.adapters, config({ mode: "live" }))

		expect(result.errors).toEqual([{ issue: key(4), message: "T3 is unreachable" }])
		expect(result.report.runs).toEqual([])
		expect(fake.writes.at(-1)).toEqual([
			{ kind: "label", issue: key(4), label: "agent-working", present: false },
		])
		expect(fake.printed).toContain("launch failed trajectonomics/cli#4: T3 is unreachable")
	})
})

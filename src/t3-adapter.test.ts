import { describe, expect, it } from "bun:test"
import type { IssueState, RepositoryState } from "./contracts"
import { evaluateEligibility } from "./eligibility"
import { RECORDED_LAUNCHED_THREAD, RECORDED_THREADS } from "./fixtures/t3-threads"
import type { RunLaunchInput } from "./run-launch"
import type { T3Client, T3LaunchRequest, T3Thread } from "./t3"
import { launchRun, listLiveThreads } from "./t3-adapter"

const NOW_MS = 1_000_000_000
const ROLE_BRIEF = "You are the implementer. Work test-first and keep the core pure."
const INPUT: RunLaunchInput = {
	issue: { repository: "trajectonomics/factory", number: 8 },
	issueTitle: "T3 adapter",
	model: { provider: "deepseek", model: "deepseek-v4" },
	roleBrief: ROLE_BRIEF,
}

type FakeT3Client = T3Client & { readonly launches: T3LaunchRequest[] }

function fakeClient(threads: readonly T3Thread[]): FakeT3Client {
	const launches: T3LaunchRequest[] = []
	return {
		launches,
		listThreads: async () => threads,
		launchThread: async (request) => {
			launches.push(request)
			return RECORDED_LAUNCHED_THREAD
		},
	}
}

describe("listLiveThreads", () => {
	it("lists the issues behind the live threads in a recorded T3 listing", async () => {
		const client = fakeClient(RECORDED_THREADS)

		const liveThreads = await listLiveThreads(client)

		expect(liveThreads).toEqual([
			{ repository: "trajectonomics/cli", number: 9 },
			{ repository: "trajectonomics/factory", number: 8 },
		])
	})

	it("matches a live thread to the Claim it holds", async () => {
		const client = fakeClient(RECORDED_THREADS)
		const ticket: IssueState = {
			key: { repository: "trajectonomics/factory", number: 8 },
			kind: "ticket",
			status: "open",
			labels: ["ready-for-agent"],
			blockers: [],
			claim: { claimedAtMs: NOW_MS - 3 * 60 * 60 * 1000 },
		}
		const state: RepositoryState = { issues: [ticket], liveThreads: await listLiveThreads(client) }
		const allowlist = [{ repository: "trajectonomics/factory", host: "homeserver2" }]

		const plan = evaluateEligibility(state, allowlist, NOW_MS)

		expect(plan.skipped).toEqual([{ issue: ticket.key, reason: { code: "live-claim" } }])
	})
})

describe("launchRun", () => {
	it("launches a Run thread on the requested provider and model", async () => {
		const client = fakeClient([])

		const outcome = await launchRun(client, INPUT, "live")

		expect(outcome.kind).toBe("launched")
		expect(client.launches).toHaveLength(1)
		expect(client.launches[0]?.model).toEqual({ provider: "deepseek", model: "deepseek-v4" })
	})

	it("launches a Run thread titled after the issue on its branch", async () => {
		const client = fakeClient([])

		await launchRun(client, INPUT, "live")

		expect(client.launches[0]?.title).toBe("traj/trajectonomics/factory#8")
		expect(client.launches[0]?.branch).toBe("factory/8-t3-adapter")
	})

	it("injects the role brief into the launched prompt", async () => {
		const client = fakeClient([])

		await launchRun(client, INPUT, "live")

		expect(client.launches[0]?.prompt.startsWith(ROLE_BRIEF)).toBe(true)
	})

	it("returns the launched thread", async () => {
		const outcome = await launchRun(fakeClient([]), INPUT, "live")

		expect(outcome).toMatchObject({ thread: RECORDED_LAUNCHED_THREAD })
	})

	it("plans the launch without launching anything in a dry run", async () => {
		const client = fakeClient([])

		const outcome = await launchRun(client, INPUT, "dry-run")

		expect(outcome.kind).toBe("dry-run")
		expect(client.launches).toEqual([])
	})

	it("returns the planned request in a dry run", async () => {
		const outcome = await launchRun(fakeClient([]), INPUT, "dry-run")

		expect(outcome.request).toMatchObject({
			title: "traj/trajectonomics/factory#8",
			branch: "factory/8-t3-adapter",
			model: { provider: "deepseek", model: "deepseek-v4" },
		})
	})
})
